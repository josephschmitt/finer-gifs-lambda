import {parse} from 'qs';

export default function getRequestData(event) {
  const {httpMethod, body, queryStringParameters} = event;

  if (httpMethod === 'GET' ) {
    return queryStringParameters;
  } else if (httpMethod === 'POST' && body) {
    const data = parse(body);

    if (data.payload && typeof data.payload === 'string') {
      return JSON.parse(data.payload);
    }

    return data;
  }

  return body || {};
}
