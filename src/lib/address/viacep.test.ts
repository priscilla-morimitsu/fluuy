import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __clearAddressCache, searchAddressByCep, searchAddressesByStreet } from "./viacep";

function jsonResponse(data: unknown, ok = true) {
  return { ok, json: async () => data } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  __clearAddressCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("searchAddressByCep", () => {
  it("maps a valid ViaCEP response", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        cep: "58030-280",
        logradouro: "Rua Aristides Lobo",
        bairro: "Bairro dos Estados",
        localidade: "João Pessoa",
        uf: "PB",
        ddd: "83",
      })
    );
    const r = await searchAddressByCep("58030-280");
    expect(r).toMatchObject({
      cep: "58030280",
      street: "Rua Aristides Lobo",
      neighborhood: "Bairro dos Estados",
      city: "João Pessoa",
      state: "PB",
      source: "cep",
    });
  });

  it("returns null when ViaCEP reports erro:true", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ erro: true }));
    expect(await searchAddressByCep("00000000")).toBeNull();
  });

  it("returns null on network failure (no leak)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    expect(await searchAddressByCep("58030280")).toBeNull();
  });

  it("does not call the API for an incomplete CEP", async () => {
    expect(await searchAddressByCep("5803")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("searchAddressesByStreet", () => {
  it("maps a list of results", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        { cep: "58030-280", logradouro: "Rua Aristides Lobo", bairro: "Bairro dos Estados", localidade: "João Pessoa", uf: "PB" },
        { cep: "58030-281", logradouro: "Rua Aristides Lobo", bairro: "Centro", localidade: "João Pessoa", uf: "PB" },
      ])
    );
    const r = await searchAddressesByStreet({ uf: "PB", city: "João Pessoa", street: "Aristides" });
    expect(r).toHaveLength(2);
    expect(r[0].source).toBe("street");
  });

  it("returns [] when required inputs are missing", async () => {
    expect(await searchAddressesByStreet({ uf: "XX", city: "J", street: "Ari" })).toEqual([]);
    expect(await searchAddressesByStreet({ uf: "PB", city: "JP", street: "ab" })).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns [] when ViaCEP responds with a non-array", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ erro: true }));
    expect(await searchAddressesByStreet({ uf: "PB", city: "João Pessoa", street: "Aristides" })).toEqual([]);
  });
});
