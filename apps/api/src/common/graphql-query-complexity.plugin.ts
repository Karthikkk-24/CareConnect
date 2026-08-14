import type { ApolloServerPlugin } from '@apollo/server';
import {
  GraphQLError,
  Kind,
  getOperationAST,
  type DocumentNode,
  type FragmentDefinitionNode,
  type GraphQLSchema,
  type OperationDefinitionNode,
  type SelectionSetNode,
} from 'graphql';
import {
  fieldExtensionsEstimator,
  getComplexity,
  simpleEstimator,
} from 'graphql-query-complexity';

/**
 * Maximum GraphQL query complexity (simpleEstimator: 1 per field by default).
 * Field-level overrides can be set via GraphQL field extensions `{ complexity }`.
 * Depth is separately capped at 10 via graphql-depth-limit (#207 / #238).
 */
export const MAX_GRAPHQL_QUERY_COMPLEXITY = 1000;

const INTROSPECTION_ROOT_FIELDS = new Set(['__schema', '__type']);

function getFragmentMap(
  document: DocumentNode,
): Map<string, FragmentDefinitionNode> {
  const fragments = new Map<string, FragmentDefinitionNode>();
  for (const definition of document.definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      fragments.set(definition.name.value, definition);
    }
  }
  return fragments;
}

/**
 * Collects root field names from an operation, resolving fragment spreads.
 * Returns null when a spread cannot be resolved so callers fail closed.
 */
function collectRootFieldNames(
  selectionSet: SelectionSetNode,
  fragments: Map<string, FragmentDefinitionNode>,
  visitedFragments: Set<string> = new Set(),
): string[] | null {
  const fieldNames: string[] = [];

  for (const selection of selectionSet.selections) {
    switch (selection.kind) {
      case Kind.FIELD:
        fieldNames.push(selection.name.value);
        break;
      case Kind.INLINE_FRAGMENT: {
        const nested = collectRootFieldNames(
          selection.selectionSet,
          fragments,
          visitedFragments,
        );
        if (nested === null) {
          return null;
        }
        fieldNames.push(...nested);
        break;
      }
      case Kind.FRAGMENT_SPREAD: {
        const fragmentName = selection.name.value;
        if (visitedFragments.has(fragmentName)) {
          break;
        }
        visitedFragments.add(fragmentName);
        const fragment = fragments.get(fragmentName);
        if (!fragment) {
          return null;
        }
        const nested = collectRootFieldNames(
          fragment.selectionSet,
          fragments,
          visitedFragments,
        );
        if (nested === null) {
          return null;
        }
        fieldNames.push(...nested);
        break;
      }
      default:
        return null;
    }
  }

  return fieldNames;
}

/**
 * True only when every root field on this operation is schema introspection
 * (`__schema` or `__type`). `__typename` and mixed data queries are not exempt.
 */
export function isPureIntrospectionOperation(
  document: DocumentNode,
  operation: OperationDefinitionNode,
): boolean {
  const fieldNames = collectRootFieldNames(
    operation.selectionSet,
    getFragmentMap(document),
  );
  if (fieldNames === null || fieldNames.length === 0) {
    return false;
  }
  return fieldNames.every((name) => INTROSPECTION_ROOT_FIELDS.has(name));
}

/**
 * True when every operation in the document is pure schema introspection.
 * Mixed documents (introspection + data) are not exempt.
 */
export function isIntrospectionDocument(document: DocumentNode): boolean {
  const operations = document.definitions.filter(
    (definition): definition is OperationDefinitionNode =>
      definition.kind === Kind.OPERATION_DEFINITION,
  );
  if (operations.length === 0) {
    return false;
  }
  return operations.every((operation) =>
    isPureIntrospectionOperation(document, operation),
  );
}

export function computeQueryComplexity(options: {
  schema: GraphQLSchema;
  query: DocumentNode;
  variables?: Record<string, unknown> | null;
  operationName?: string | null;
}): number {
  return getComplexity({
    schema: options.schema,
    query: options.query,
    variables: options.variables ?? undefined,
    operationName: options.operationName ?? undefined,
    estimators: [
      fieldExtensionsEstimator(),
      simpleEstimator({ defaultComplexity: 1 }),
    ],
  });
}

export function assertQueryWithinComplexityLimit(complexity: number): void {
  if (complexity > MAX_GRAPHQL_QUERY_COMPLEXITY) {
    throw new GraphQLError(
      `Query is too complex: ${complexity}. Maximum allowed complexity: ${MAX_GRAPHQL_QUERY_COMPLEXITY}`,
      {
        extensions: {
          code: 'QUERY_TOO_COMPLEX',
          complexity,
          maximumComplexity: MAX_GRAPHQL_QUERY_COMPLEXITY,
        },
      },
    );
  }
}

export const graphqlQueryComplexityPlugin: ApolloServerPlugin = {
  requestDidStart() {
    return Promise.resolve({
      didResolveOperation({
        request,
        document,
        schema,
        operation,
        operationName,
      }) {
        const resolvedOperation =
          operation ??
          getOperationAST(
            document,
            operationName ?? request.operationName ?? undefined,
          );

        // Skip the budget only for the resolved operation, and only when it is
        // purely schema introspection. Normal operations always pay complexity.
        if (
          resolvedOperation &&
          isPureIntrospectionOperation(document, resolvedOperation)
        ) {
          return Promise.resolve();
        }

        const complexity = computeQueryComplexity({
          schema,
          query: document,
          variables: request.variables,
          operationName: request.operationName,
        });

        assertQueryWithinComplexityLimit(complexity);
        return Promise.resolve();
      },
    });
  },
};
