import { buildSchema, GraphQLError, parse } from 'graphql';
import {
  assertQueryWithinComplexityLimit,
  computeQueryComplexity,
  isIntrospectionDocument,
  MAX_GRAPHQL_QUERY_COMPLEXITY,
} from './graphql-query-complexity.plugin';

const schema = buildSchema(`
  type Query {
    hello: String
  }
`);

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

  it('treats GraphQL introspection as exempt', () => {
    expect(
      isIntrospectionDocument(parse('{ __schema { queryType { name } } }')),
    ).toBe(true);
    expect(isIntrospectionDocument(parse('{ hello }'))).toBe(false);
  });
});
