
/**
 * Utilities to generate an Ecency Access Token client-side.
 * This bypasses the need for the /login endpoint which may return 404.
 * We construct a "Hivesigner-style" signed message which Ecency accepts as an accessToken.
 */

export interface LoginPayload {
  signed_message: {
    type: string;
    app: string;
  };
  authors: string[];
  timestamp: number;
}

/**
 * Creates the payload object that needs to be signed.
 */
export const createEcencyLoginPayload = (username: string): LoginPayload => {
  return {
    signed_message: { 
      type: 'code', 
      app: 'ecency.app' 
    },
    authors: [username],
    timestamp: Math.floor(Date.now() / 1000),
  };
};

/**
 * Combines the payload and signature into a Base64URL encoded string.
 * This string acts as the "accessToken" for the bootstrap endpoint.
 */
export const createEcencyToken = (payload: LoginPayload, signature: string): string => {
  const tokenObj = {
    ...payload,
    signatures: [signature]
  };
  
  const jsonString = JSON.stringify(tokenObj);
  
  // Convert to Base64
  const base64 = btoa(jsonString);
  
  // Convert Base64 to Base64URL (replace + with -, / with _, remove =)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
