import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PasswordSchema } from 'shared';

/** Shared password policy: min 6 chars, 1 uppercase, 1 number, 1 special character. */
describe('PasswordSchema', () => {
  it('accepts passwords meeting the policy', () => {
    for (const password of ['Admin@1', 'School#2', 'LUG!2026', 'ABCD@1']) {
      assert.doesNotThrow(() => PasswordSchema.parse(password));
    }
  });

  it('rejects a password missing an uppercase letter', () => {
    assert.throws(() => PasswordSchema.parse('admin@1'));
  });

  it('rejects a password missing a number and special character', () => {
    assert.throws(() => PasswordSchema.parse('Adminaa'));
  });

  it('rejects a password missing a special character', () => {
    assert.throws(() => PasswordSchema.parse('Admin1'));
  });

  it('rejects a password shorter than 6 characters', () => {
    assert.throws(() => PasswordSchema.parse('A@1'));
  });

  it('accepts lowercase-free passwords since lowercase is not required', () => {
    assert.doesNotThrow(() => PasswordSchema.parse('ADMIN@1'));
  });
});
