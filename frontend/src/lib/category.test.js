import test from 'node:test';
import assert from 'node:assert/strict';
import { POST_CATEGORY_API_CODES, postCategoryFromApi, postCategoryToApi } from './category.js';

test('community labels map to backend enum codes and back', () => {
  for (const [label, code] of Object.entries(POST_CATEGORY_API_CODES)) {
    assert.equal(postCategoryToApi(label), code);
    assert.equal(postCategoryFromApi(code), label);
  }
});

test('legacy backend category codes remain displayable', () => {
  assert.equal(postCategoryFromApi('QNA'), '질문');
  assert.equal(postCategoryFromApi('INFO'), '정보');
  assert.equal(postCategoryFromApi('MARKET_REVIEW'), '거래후기');
});