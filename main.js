import axios from 'axios';
import dotenv from 'dotenv';
import hashtag from 'hashtag';
import path from 'path';
import stripIndent from 'strip-indent';
import unescape from 'unescape';

import {WebClient} from '@slack/client';

import formatAttachment from './lib/formatAttachment.js';
import getRequestData from './lib/getRequestData.js';
import searchFinerGifs, {MAX_RESULTS} from './lib/searchFinerGifs.js';

const client = new WebClient();
const clientId = process.env.SLACK_CLIENT_ID;
const clientSecret = process.env.SLACK_CLIENT_SECRET

const HELP_TEXT = `
  Try searching for your favorite quote from the The Office:
    \`/finer-gifs talk smack\`

  This will post the top search result for whatever query you submitted. If you
  want to add a little randomness into your life, you can grab a random result:
    \`/finer-gifs talk smack #random (or #shuffle)\`

  Or, if you're risk-averse and want complete control over what gif gets posted
  in your good name:
    \`/finer-gifs talk smack #select (or #choose)\`
`;

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
    }

    if (requestData.type === 'interactive_message') {
      const [action] = requestData.actions;

      if (requestData.callback_id === 'load_or_cancel') {
        if (!action.value) {
          await axios.post(requestData.response_url, {delete_original: true});
          return callback(null, {statusCode: 200});
        }

        const value = JSON.parse(action.value);
        const msg = await buildSearchResponseMsg(value.text, requestData.user.id, value.start);

        await axios.post(requestData.response_url, msg);
        return callback(null, {statusCode: 200});
      }

      const value = JSON.parse(action.value);
      value.pretext = unescape(value.pretext);
      const message = {
        replace_original: false,
        delete_original: true,
        response_type: 'in_channel',
        attachments: [value],
      };

      await axios.post(requestData.response_url, message);
      return callback(null, {statusCode: 200});
    }

    if (requestData.code) {
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
    }

    if (requestData.token !== process.env.SLACK_VERIFICATION_TOKEN) {
      return callback(null, {statusCode: 403, body: 'Forbidden'});
    }

    if (requestData.text) {
      if (requestData.text === 'help') {
        return callback(null, {
          statusCode: 200,
          body: JSON.stringify({
            response_type: 'ephemeral',
            text: stripIndent(HELP_TEXT).trim(),
          }),
        })
      }

      return callback(null, {
        statusCode: 200,
        body: JSON.stringify(await buildSearchResponseMsg(requestData.text, requestData.user_id)),
      });
    }

    // Default response
    callback(null, {statusCode: 200});
  } catch (e) {
    callback(e);
  }
}

async function buildSearchResponseMsg(text, user_id, start = 0) {
  const {tokens, tags} = hashtag.parse(text);
  const query = tokens.reduce((val, tok) => val + (tok.text || ''), '').trim();

  const {results, hits} = await searchFinerGifs(query, tags, start);

  if (!query) {
    return {
      response_type: 'ephemeral',
      text: 'Please enter a search term.',
    };
  }

  if (!results.length) {
    return {
      response_type: 'ephemeral',
      text: `No results for ‘${query}’.`,
    };
  }

  let response_type = 'in_channel';
  if (tags.includes('select') || tags.includes('choose')) {
    response_type = 'ephemeral';
  }

  const attachments = results.slice(0, MAX_RESULTS).map(({fields}) => {
    return formatAttachment(query, fields, hits.found, results.length > 1, user_id);
  });

  if (hits.found > MAX_RESULTS) {
    const loadMoreVal = {text, start: start + MAX_RESULTS};

    attachments.splice(attachments.length, 0, {
      title: `${hits.found} total results`,
      title_link: `${process.env.SITE_BASE_URL}?q=${query}`,
      callback_id: 'load_or_cancel',
      actions: [
        {name: 'more', type: 'button', text: 'Load More', value: JSON.stringify(loadMoreVal)},
        {name: 'cancel', type: 'button', style: 'danger', text: 'Cancel'},
      ],
    });
  }

  return {
    response_type,
    replace_original: start > 0,
    delete_original: response_type === 'in_channel',
    attachments,
  }
}
