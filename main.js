import dotenv from 'dotenv';
import path from 'path';

import {WebClient} from '@slack/client';

import searchFinerGifs from './lib/searchFinerGifs.js';

const client = new WebClient();
const clientId = process.env.SLACK_CLIENT_ID;
const clientSecret = process.env.SLACK_CLIENT_SECRET

export default async function (event, context, callback) {
  try {
    if (!process.env.SLACK_VERIFICATION_TOKEN) {
      dotenv.config({
        path: path.join(__dirname, 'deploy.env')
      });
    }

    if (event.type === 'url_verification') {
      return callback(null, event.challenge);
    } else if (event.queryStringParameters && event.queryStringParameters.code) {
      const {code} = event.queryStringParameters;
      const resp = await client.oauth.access({
        client_id: clientId,
        client_secret: clientSecret,
        code
      });

      callback(null, {
        statusCode: 302,
        headers: {
          Location: process.env.SITE_BASE_URL,
        },
        body: JSON.stringify(resp)
      });
    } else if (event.token !== process.env.SLACK_VERIFICATION_TOKEN) {
      return callback();
    }

    if (event.text) {
      const {results, hits} = await searchFinerGifs(event.text);
      const [result] = results;

      if (!result) {
        return callback(null, {
          response_type: 'ephemeral',
          text: `No results for ‘${event.text}’`
        });
      }

      const {text, fileid} = result.fields;
      const image_url = `${process.env.CDN_BASE_URL}/${fileid}.gif`;

      return callback(null, {
        response_type: 'in_channel',
        attachments: [{
          pretext: text,
          title: `${event.text} (${hits.found} result${hits.found !== 1 ? 's' : ''})`,
          title_link: `${process.env.SITE_BASE_URL}?q=${event.text}`,
          image_url,
        }]
      });
    }

    // Default response
    callback(null, {});
  } catch (e) {
    callback(null, {
      statusCode: 500,
      body: JSON.stringify(e),
    });
  }
}
