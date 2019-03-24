import hashtag from 'hashtag';
import stripIndent from 'strip-indent';

import formatAttachment from './formatAttachment.js';
import searchFinerGifs, {MAX_RESULTS} from './searchFinerGifs.js';

export const HELP_TEXT = `
  Try searching for your favorite quote from the The Office:
    \`/finer-gifs talk smack\`

  This will present you with a list of gifs for whatever query you submitted.
  If you want to add a little randomness into your life, you can grab a random result:
    \`/finer-gifs talk smack #random (or #shuffle)\`

  Or, if you're feeling confident and want to auto-post the top result:
    \`/finer-gifs talk smack #1 (or #top)\`
`;

export default async function buildSearchResponseMsg(text, user_id, start = 0) {
  if (text === 'help') {
    return {
      response_type: 'ephemeral',
      text: stripIndent(HELP_TEXT).trim(),
    };
  }

  const {tokens, tags} = hashtag.parse(text);
  const query = tokens.reduce((val, tok) => val + (tok.text || ''), '').trim();

  if (!query) {
    return {
      response_type: 'ephemeral',
      text: 'Please enter a search term.',
    };
  }

  const {results, hits} = await searchFinerGifs(query, tags, start);

  if (!results.length) {
    return {
      response_type: 'ephemeral',
      text: `No results for ‘${query}’.`,
    };
  }

  let response_type = 'ephemeral';
  if (tags.includes('1') || tags.includes('top') || tags.includes('random') ||
      tags.includes('shuffle')) {
    response_type = 'in_channel';
  }

  const attachments = results.map(({fields}) => {
    return formatAttachment(query, fields, hits.found, response_type === 'ephemeral', user_id);
  });

  if (response_type === 'ephemeral' && start + MAX_RESULTS < hits.found) {
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
