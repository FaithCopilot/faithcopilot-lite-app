/**
 * readRequestBody reads in the incoming request body
 * Use await readRequestBody(..) in an async function to get the string
 * @param {Request} request the incoming request to read from
 * see: https://developers.cloudflare.com/workers/examples/read-post/
 */
async function readRequestBody(request) {
  const contentType = request.headers.get("content-type");
  if (contentType.includes("application/json")) {
    //return JSON.stringify(await request.json());
    return await request.json();
  } else if (contentType.includes("application/text")) {
    return request.text();
  } else if (contentType.includes("text/html")) {
    return request.text();
  } else if (contentType.includes("form")) {
    const formData = await request.formData();
    const body = {};
    for (const entry of formData.entries()) {
      body[entry[0]] = entry[1];
    }
    return JSON.stringify(body);
  } else {
    // Perhaps some other type of data was submitted in the form
    // like an image, or some other binary data.
    return  undefined; //"a file";
  }
}

export async function onRequestPost({ request, env }) {
  const data = await readRequestBody(request);
  if (
    !data?.messages ||
    !env?.FAITHCOPILOT_URL ||
    !env?.FAITHCOPILOT_TOKEN ||
    !env?.FAITHCOPILOT_CHAT_PROFILE_ID
  ) {
    return new Response("Bad Request", { status: 400 });
  };
  const url = env.FAITHCOPILOT_URL;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.FAITHCOPILOT_TOKEN}`
    },
    body: JSON.stringify({
      ...data,
      model: env.FAITHCOPILOT_CHAT_PROFILE_ID
    })
  };
  return fetch(url, options);
  const response = await fetch(url, options);
  // clone the response to return a response with modifiable headers
  const newResponse = new Response(response.body, response);
  return newResponse;
};