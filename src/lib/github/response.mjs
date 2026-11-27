export async function githubResponse(response) {
  if (response.status === 401 || (response.redirected && new URL(response.url).pathname.startsWith('/app/login'))) {
    throw new Error('Je sessie is verlopen. Meld opnieuw aan en probeer het nogmaals.');
  }
  if (response.status === 429) throw new Error('Te veel aanvragen. Wacht even en probeer het opnieuw.');
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new Error('De GitHub-koppeling is tijdelijk niet bereikbaar. Probeer het opnieuw.');
  }
  let body;
  try { body = await response.json(); }
  catch { throw new Error('Het antwoord van de GitHub-koppeling kon niet worden gelezen. Probeer het opnieuw.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('De GitHub-koppeling gaf geen geldig antwoord. Probeer het opnieuw.');
  if (!response.ok) throw Object.assign(new Error(typeof body.error === 'string' ? body.error : 'GitHub ophalen mislukt. Probeer het opnieuw.'), {status: response.status, code: body.code});
  return body;
}
