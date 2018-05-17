import axios from 'axios';
import dotenv from 'dotenv';
import hashtag from 'hashtag';
import path from 'path';

import {WebClient} from '@slack/client';

import formatAttachment from './lib/formatAttachment.js';
import getRequestData from './lib/getRequestData.js';
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

    const requestData = getRequestData(event);

    if (requestData.type === 'url_verification') {
      return callback(null, {statusCode: 200, body: requestData.challenge});
    } else if (requestData.type === 'interactive_message') {
      callback(null, {statusCode: 200});

      const [action] = requestData.actions;
      const message = {
        replace_original: true,
        attachments: [JSON.parse(action.value)],
      };

      console.log('POST ' + requestData.response_url, JSON.stringify({data: message}))
      return axios.post(requestData.response_url, {data: message});
    } else if (requestData.code) {
      const resp = await client.oauth.access({
        client_id: clientId,
        client_secret: clientSecret,
        code: requestData.code,
      });

      return callback(null, {
        statusCode: 302,
        headers: {
          Location: process.env.SITE_BASE_URL,
        },
        body: JSON.stringify(resp),
      });
    } else if (requestData.token !== process.env.SLACK_VERIFICATION_TOKEN) {
      return callback(null, {statusCode: 403, body: 'Forbidden'});
    }

    if (requestData.text) {
      const {tokens, tags} = hashtag.parse(requestData.text);
      const query = tokens.reduce((val, tok) => val + (tok.text || ''), '').trim();

      const {results, hits} = await searchFinerGifs(query, tags);

      if (!results.length) {
        return callback(null, {
          statusCode: 200,
          body: JSON.stringify({
            response_type: 'ephemeral',
            text: `No results for ‘${query}’`,
          }),
        });
      }

      let response_type = 'in_channel';
      if (tags.includes('select') || tags.includes('choose')) {
        response_type = 'ephemeral';
      }

      return callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          response_type,
          attachments: results.slice(0, 5).map(({fields}) => {
            return formatAttachment(query, fields, hits.found, results.length > 1);
          }),
        }),
      });
    }

    // Default response
    callback(null, {statusCode: 200});
  } catch (e) {
    callback(e);
  }
}
