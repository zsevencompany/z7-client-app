// Tests de la logique d'affichage des codes de partie (node:test, sans dependance).
//   npm test   (node --test tests/codesPartie.test.ts)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etatGame, gestesPermis, resteFenetre, codeSaisiValide, corpsGeste, lireRefus, heureParis, type GameServeur } from '../src/components/codesPartieLogique.ts';

const T0 = Date.parse('2026-10-23T18:00:00Z');
const game = (x: Partial<GameServeur> = {}): GameServeur => ({ partie: 1, statut: 'active', version: 1, code: '1515', ouverteLe: '2026-10-23T18:00:00Z',
  fenetreJusquA: '2026-10-23T18:05:00Z', fenetreActive: true, clotureLe: null, remises: 3, ...x });

test('états : actif, modifié, expiré, clôturé', () => {
  assert.equal(etatGame(game(), T0 + 60_000), 'actif');
  assert.equal(etatGame(game({ version: 2, code: '2727' }), T0 + 60_000), 'modifie');
  assert.equal(etatGame(game(), T0 + 6 * 60_000), 'expire');
  assert.equal(etatGame(game({ version: 2 }), T0 + 6 * 60_000), 'expire');
  assert.equal(etatGame(game({ statut: 'closed', clotureLe: '2026-10-23T18:03:00Z' }), T0 + 60_000), 'cloture');
});

test('gestes : aucun sur une game clôturée ; modifier/renvoyer/clôturer sinon (même après la fenêtre)', () => {
  assert.deepEqual(gestesPermis('cloture'), []);
  for (const e of ['actif', 'modifie', 'expire'] as const) assert.deepEqual(gestesPermis(e), ['modifier', 'renvoyer', 'cloturer']);
});

test('fenêtre : temps restant m:ss, null après la fin ou si clôturée', () => {
  assert.equal(resteFenetre(game(), T0 + 60_000), '4:00');
  assert.equal(resteFenetre(game(), T0 + 4 * 60_000 + 55_000), '0:05');
  assert.equal(resteFenetre(game(), T0 + 5 * 60_000), null);
  assert.equal(resteFenetre(game({ statut: 'closed' }), T0), null);
});

test('heure de Paris, indépendante du poste', () => {
  assert.equal(heureParis('2026-10-23T18:00:00Z'), '20:00');
  assert.equal(heureParis('2026-12-23T18:00:00Z'), '19:00');
  assert.equal(heureParis(null), '—');
});

test('code saisi : mêmes bornes que le serveur', () => {
  assert.equal(codeSaisiValide('  2727 '), '2727');
  assert.equal(codeSaisiValide(''), null);
  assert.equal(codeSaisiValide('a'.repeat(65)), null);
  assert.equal(codeSaisiValide('15\n15'), null);
});

test('corps des gestes : modifier ≠ renvoyer ; renvoyer ne porte jamais de code ; clôturer non plus', () => {
  assert.deepEqual(corpsGeste('modifier', 'T', 0, 1, '2727'), { tournamentId: 'T', stageIndex: 0, partie: 1, action: 'modifier', code: '2727' });
  assert.deepEqual(corpsGeste('renvoyer', 'T', 0, 1, '2727', true), { tournamentId: 'T', stageIndex: 0, partie: 1, action: 'renvoyer', renvoyer: true });
  assert.deepEqual(corpsGeste('cloturer', 'T', 0, 2, 'X'), { tournamentId: 'T', stageIndex: 0, partie: 2, action: 'cloturer' });
});

test('refus du serveur : messages clairs ; état obsolète → à recharger', () => {
  assert.deepEqual(lireRefus({ status: 409, data: { code: 'PARTIE_CLOTUREE' }, message: '' }), { message: 'Cette game est déjà clôturée : son code ne part plus.', aRelire: true });
  assert.equal(lireRefus({ status: 409, data: { code: 'CONFLIT' }, message: '' }).aRelire, true);
  assert.equal(lireRefus({ status: 400, data: { code: 'CODE_IDENTIQUE' }, message: '' }).aRelire, false);
  assert.match(lireRefus({ status: 403, data: { success: false }, message: 'x' }).message, /Droits insuffisants/);
  assert.match(lireRefus({ status: 401, data: null, message: 'x' }).message, /reconnectez-vous/);
  assert.match(lireRefus({ status: 0, data: null, message: 'Serveur injoignable : vérifie la connexion internet.' }).message, /injoignable/);
  assert.match(lireRefus({ status: 500, data: { success: false, message: 'Erreur serveur' }, message: 'Erreur serveur' }).message, /Erreur serveur/);
});
