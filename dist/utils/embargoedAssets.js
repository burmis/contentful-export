"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.calculateExpiryTimestamp = calculateExpiryTimestamp;
exports.isEmbargoedAsset = isEmbargoedAsset;
exports.signUrl = signUrl;
var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));
var _nodeFetch = _interopRequireDefault(require("node-fetch"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const SIX_HOURS_IN_MS = 6 * 60 * 60 * 1000;
const assetKeyCache = new Map();
function createAssetKey(host, accessToken, spaceId, environmentId, expiresAtMs) {
  return (0, _nodeFetch.default)(`https://${host}/spaces/${spaceId}/environments/${environmentId}/asset_keys`, {
    method: 'POST',
    body: JSON.stringify({
      expiresAt: Math.floor(expiresAtMs / 1000) // in seconds
    }),

    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
}
async function createCachedAssetKey(host, accessToken, spaceId, environmentId, minExpiresAtMs) {
  const cacheKey = `${host}:${spaceId}:${environmentId}`;
  let cacheItem = assetKeyCache.get(cacheKey);
  if (!cacheItem || cacheItem.expiresAtMs < minExpiresAtMs) {
    const expiresAtMs = calculateExpiryTimestamp();
    if (minExpiresAtMs > expiresAtMs) {
      throw new Error(`Cannot fetch an asset key so far in the future: ${minExpiresAtMs} > ${expiresAtMs}`);
    }
    try {
      const assetKeyPromise = createAssetKey(host, accessToken, spaceId, environmentId, expiresAtMs);
      const resolvedAssetKeyPromise = await assetKeyPromise;
      const result = await resolvedAssetKeyPromise.json();
      cacheItem = {
        expiresAtMs,
        result: result
      };
      assetKeyCache.set(cacheKey, cacheItem);
    } catch (err) {
      // If we encounter an error, make sure to clear the cache item if this is the most recent fetch.
      const curCacheItem = assetKeyCache.get(cacheKey);
      if (curCacheItem === cacheItem) {
        assetKeyCache.delete(cacheKey);
      }
      return Promise.reject(err);
    }
  }
  return cacheItem.result;
}
function generateSignedToken(secret, urlWithoutQueryParams, expiresAtMs) {
  // Convert expiresAtMs to seconds, if defined
  const exp = expiresAtMs ? Math.floor(expiresAtMs / 1000) : undefined;
  return _jsonwebtoken.default.sign({
    sub: urlWithoutQueryParams,
    exp
  }, secret, {
    algorithm: 'HS256'
  });
}
function generateSignedUrl(policy, secret, url, expiresAtMs) {
  const parsedUrl = new URL(url);
  const urlWithoutQueryParams = parsedUrl.origin + parsedUrl.pathname;
  const token = generateSignedToken(secret, urlWithoutQueryParams, expiresAtMs);
  parsedUrl.searchParams.set('token', token);
  parsedUrl.searchParams.set('policy', policy);
  return parsedUrl.toString();
}
function isEmbargoedAsset(url) {
  const pattern = /((images)|(assets)|(downloads)|(videos))\.secure\./;
  return pattern.test(url);
}
function calculateExpiryTimestamp() {
  return Date.now() + SIX_HOURS_IN_MS;
}
function signUrl(host, accessToken, spaceId, environmentId, url, expiresAtMs) {
  // handle urls without protocol
  if (url.startsWith('//')) {
    url = 'https:' + url;
  }
  return createCachedAssetKey(host, accessToken, spaceId, environmentId, expiresAtMs).then(({
    policy,
    secret
  }) => generateSignedUrl(policy, secret, url, expiresAtMs));
}