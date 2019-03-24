import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import unescape from 'unescape';

import {WebClient} from '@slack/client';

import buildSearchResponseMsg from './lib/buildSearchResponseMsg.js';
import getRequestData from './lib/getRequestData.js';

const client = new WebClient();
const clientId = process.env.SLACK_CLIENT_ID;
const clientSecret = process.env.SLACK_CLIENT_SECRET

export default async function (event) {
  try {
    if (!process.env.SLACK_VERIFICATION_TOKEN) {
      dotenv.config({
        path: path.join(__dirname, 'deploy.env')
      });
    }

    const requestData = getRequestData(event);

    if (requestData.type === 'url_verification') {
      return {statusCode: 200, body: requestData.challenge};
    }

    if (requestData.type === 'interactive_message') {
      const [action] = requestData.actions;

      if (requestData.callback_id === 'load_or_cancel') {
        if (!action.value) {
          await axios.post(requestData.response_url, {delete_original: true});
          return {statusCode: 200};
        }

        const value = JSON.parse(action.value);
        const msg = await buildSearchResponseMsg(value.text, requestData.user.id, value.start);

        await axios.post(requestData.response_url, msg);
        return {statusCode: 200};
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
      return {statusCode: 200};
    }

    if (requestData.code) {
      const resp = await client.oauth.access({
        client_id: clientId,
        client_secret: clientSecret,
        code: requestData.code,
      });

      return {
        statusCode: 302,
        headers: {
          Location: process.env.SITE_BASE_URL,
        },
        body: JSON.stringify(resp),
      };
    }

    if (requestData.token !== process.env.SLACK_VERIFICATION_TOKEN) {
      return {statusCode: 403, body: 'Forbidden'};
    }

    if (requestData.text) {
      return {
        statusCode: 200,
        body: JSON.stringify(await buildSearchResponseMsg(requestData.text, requestData.user_id)),
      };
    }

    // Default response
    return {statusCode: 200};
  } catch (e) {
    console.error(e);
    return e;
  }
}
