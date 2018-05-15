import dotenv from 'dotenv';
import path from 'path';

import searchFinerGifs from './lib/searchFinerGifs.js';

export default async function (event, context, callback) {
  if (!process.env.SLACK_VERIFICATION_TOKEN) {
    dotenv.config({path: path.join(__dirname, 'deploy.env')});
  }

  if (event.type === 'url_verification') {
    return callback(null, event.challenge);
  } else if (event.token !== process.env.SLACK_VERIFICATION_TOKEN) {
    return callback();
  }

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
  callback(null, {
    response_type: 'in_channel',
    attachments: [{
      pretext: text,
      title: `${event.text} (${hits.found} result${hits.found !== 1 ? 's' : ''})`,
      title_link: `${process.env.SITE_BASE_URL}?q=${event.text}`,
      image_url,
    }]
  })
}
