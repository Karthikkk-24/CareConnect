import type { ApolloServerPlugin } from '@apollo/server';
import {
  GraphQLError,
  Kind,
  type DocumentNode,
  type GraphQLSchema,
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

export function isIntrospectionDocument(document: DocumentNode): boolean {
  return document.definitions.some((definition) => {
    if (definition.kind !== Kind.OPERATION_DEFINITION) {
      return false;
    }
    return definition.selectionSet.selections.some(
      (selection) =>
        selection.kind === Kind.FIELD && selection.name.value.startsWith('__'),
    );
  });
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
      didResolveOperation({ request, document, schema }) {
        if (isIntrospectionDocument(document)) {
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
