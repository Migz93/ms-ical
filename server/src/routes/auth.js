import express from 'express';
import { getMsalClient } from '../msal/client.js';
import { SCOPES, getRedirectUri } from '../msal/config.js';

const router = express.Router();

router.get('/login', async (req, res) => {
  try {
    const msalClient = getMsalClient();
    const authCodeUrlParameters = {
      scopes: SCOPES,
      redirectUri: getRedirectUri()
    };
    
    const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/callback', async (req, res) => {
  try {
    const msalClient = getMsalClient();
    const tokenRequest = {
      code: req.query.code,
      scopes: SCOPES,
      redirectUri: getRedirectUri()
    };
    
    const response = await msalClient.acquireTokenByCode(tokenRequest);
    req.session.accountId = response.account.homeAccountId;
    
    res.redirect('/?auth=success');
  } catch (error) {
    console.error('Callback error:', error);
    res.redirect(`/?auth=error&message=${encodeURIComponent(error.message)}`);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

router.get('/status', async (req, res) => {
  try {
    const msalClient = getMsalClient();
    const accounts = await msalClient.getTokenCache().getAllAccounts();
    
    if (accounts.length === 0) {
      return res.json({ 
        authenticated: false,
        accountId: null
      });
    }

    // Use the first account (same as calendars endpoint)
    const account = accounts[0];

    // Try to get token info to check expiry
    let accessTokenExpiry = null;
    let refreshTokenExpiry = null;
    
    try {
      const silentRequest = {
        account: account,
        scopes: SCOPES
      };
      const response = await msalClient.acquireTokenSilent(silentRequest);
      
      if (response.expiresOn) {
        accessTokenExpiry = response.expiresOn.toISOString();
      }
      
      // Try to get refresh token expiry from the token cache
      const tokenCache = msalClient.getTokenCache();
      const cacheData = await tokenCache.serialize();
      
      // Parse cache to find refresh token info
      if (cacheData) {
        try {
          const cache = JSON.parse(cacheData);
          // Look for refresh tokens in the cache
          if (cache.RefreshToken) {
            const refreshTokens = Object.values(cache.RefreshToken);
            if (refreshTokens.length > 0) {
              const rt = refreshTokens[0];
              // Refresh tokens typically don't have explicit expiry in MSAL,
              // but we can check if there's an extended_expires_on field
              if (rt.extended_expires_on) {
                refreshTokenExpiry = new Date(rt.extended_expires_on * 1000).toISOString();
              }
            }
          }
        } catch (parseErr) {
          console.log('Could not parse token cache:', parseErr.message);
        }
      }
    } catch (err) {
      // Token might be expired or invalid
      console.log('Could not get token expiry:', err.message);
      return res.json({ 
        authenticated: false,
        accountId: null
      });
    }

    res.json({ 
      authenticated: true,
      accountId: account.homeAccountId,
      username: account.username,
      name: account.name,
      accessTokenExpiry: accessTokenExpiry,
      refreshTokenExpiry: refreshTokenExpiry
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.json({ 
      authenticated: false,
      accountId: null
    });
  }
});

export default router;
