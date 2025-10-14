// functions/ping.js
export const onRequest = async () => {
  return new Response('pong', { status: 200 })
}
