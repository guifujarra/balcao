import { afterEach, expect, it, vi } from 'vitest'
import { HttpSyncTransport } from './HttpSyncTransport'
afterEach(() => vi.unstubAllGlobals())
it('exige HTTPS e recusa resposta remota inválida sem alterar o armazenamento local', async () => {
  expect(() => new HttpSyncTransport('http://example.test', async () => 'token')).toThrow('HTTPS')
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ acceptedTransactionIds: ['unknown'], conflicts: [] }), {
      status: 200,
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  const adapter = new HttpSyncTransport('https://example.test', async () => 'token')
  await expect(adapter.push([])).rejects.toThrow('desconhecida')
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ acceptedTransactionIds: ['tx1'], conflicts: [] }), {
      status: 200,
    }),
  )
  await expect(
    adapter.push([{ transactionId: 'tx1', storeId: 'store', mutations: [] }]),
  ).resolves.toMatchObject({ acceptedTransactionIds: ['tx1'] })
})
