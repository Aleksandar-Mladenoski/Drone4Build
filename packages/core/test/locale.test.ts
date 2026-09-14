import test from 'node:test';
import assert from 'node:assert/strict';
import { createTranslator } from '../src/locale.ts';

test('English reference and missing-key fallback', () => {
  const {t,locale}=createTranslator({hello:'Hello {name}'});
  assert.equal(locale,'en'); assert.equal(t('hello',{name:'Alek'}),'Hello Alek'); assert.equal(t('missing'),'[missing]');
});
