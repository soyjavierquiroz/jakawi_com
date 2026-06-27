export async function getOpenAISellerReply() {
  if (!process.env.OPENAI_API_KEY) return null;
  // TODO: Wire an OpenAI provider after the template MVP is validated in production.
  return null;
}
