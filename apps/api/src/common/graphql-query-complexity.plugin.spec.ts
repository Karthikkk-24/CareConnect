import { buildSchema, getOperationAST, GraphQLError, parse } from 'graphql';
import {
  assertQueryWithinComplexityLimit,
  computeQueryComplexity,
  isIntrospectionDocument,
  isPureIntrospectionOperation,
  MAX_GRAPHQL_QUERY_COMPLEXITY,
} from './graphql-query-complexity.plugin';

const schema = buildSchema(`
  type Query {
    hello: String
  }
`);

function requireOperation(source: string, operationName?: string) {
  const document = parse(source);
  const operation = getOperationAST(document, operationName);
  if (!operation) {
    throw new Error(`Expected operation ${operationName ?? '(anonymous)'}`);
  }
  return { document, operation };
}

describe('graphql query complexity', () => {
  it('counts each selected field toward the budget', () => {
    const complexity = computeQueryComplexity({
      schema,
      query: parse('{ hello }'),
    });
    expect(complexity).toBe(1);
  });

  it('rejects queries over MAX_GRAPHQL_QUERY_COMPLEXITY', () => {
    const aliases = Array.from(
      { length: MAX_GRAPHQL_QUERY_COMPLEXITY + 1 },
      (_, i) => `a${i}: hello`,
    ).join('\n');
    const complexity = computeQueryComplexity({
      schema,
      query: parse(`{ ${aliases} }`),
    });
    expect(complexity).toBe(MAX_GRAPHQL_QUERY_COMPLEXITY + 1);
    expect(() => assertQueryWithinComplexityLimit(complexity)).toThrow(
      GraphQLError,
    );
    try {
      assertQueryWithinComplexityLimit(complexity);
    } catch (error) {
      expect(error).toBeInstanceOf(GraphQLError);
      expect((error as GraphQLError).extensions.code).toBe('QUERY_TOO_COMPLEX');
    }
  });

  it('allows queries at the maximum complexity', () => {
    expect(() =>
      assertQueryWithinComplexityLimit(MAX_GRAPHQL_QUERY_COMPLEXITY),
    ).not.toThrow();
  });

  it('treats GraphQL schema introspection as exempt', () => {
    expect(
      isIntrospectionDocument(parse('{ __schema { queryType { name } } }')),
    ).toBe(true);
    expect(
      isIntrospectionDocument(parse('{ __type(name: "Query") { name } }')),
    ).toBe(true);
    expect(isIntrospectionDocument(parse('{ hello }'))).toBe(false);
  });

  it('does not treat __typename as schema introspection', () => {
    expect(isIntrospectionDocument(parse('{ __typename }'))).toBe(false);
    expect(isIntrospectionDocument(parse('{ __typename hello }'))).toBe(false);

    const { document, operation } = requireOperation('{ __typename hello }');
    expect(isPureIntrospectionOperation(document, operation)).toBe(false);
  });

  it('does not exempt mixed introspection and data selections', () => {
    expect(
      isIntrospectionDocument(
        parse('{ __schema { queryType { name } } hello }'),
      ),
    ).toBe(false);
  });

  it('does not exempt mixed documents that also contain data operations', () => {
    const source = `
      query Intro { __schema { queryType { name } } }
      query Normal { hello }
    `;
    const document = parse(source);
    expect(isIntrospectionDocument(document)).toBe(false);

    const intro = requireOperation(source, 'Intro');
    const normal = requireOperation(source, 'Normal');
    expect(isPureIntrospectionOperation(intro.document, intro.operation)).toBe(
      true,
    );
    expect(
      isPureIntrospectionOperation(normal.document, normal.operation),
    ).toBe(false);
  });

  it('treats fragment-only schema introspection as exempt', () => {
    const source = `
      query Intro {
        ...SchemaFields
      }
      fragment SchemaFields on Query {
        __schema { queryType { name } }
      }
    `;
    const { document, operation } = requireOperation(source, 'Intro');
    expect(isPureIntrospectionOperation(document, operation)).toBe(true);
    expect(isIntrospectionDocument(document)).toBe(true);
  });
});
