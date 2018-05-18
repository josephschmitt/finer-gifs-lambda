import axios from 'axios';
import shuffle from 'lodash.shuffle';

export const MAX_RESULTS = 5;

export default async function searchFinerGifs(q, tags = [], start = 0) {
  let size = 1;
  if (tags.includes('shuffle') || tags.includes('random')) {
    size = 100;
  } else if (tags.includes('select') || tags.includes('choose')) {
    size = MAX_RESULTS;
  }

  const {data} = await axios.get(process.env.API_BASE_URL + '/search', {
    params: {q, size, start},
  });

  if (Array.isArray(data.results) && data.results.length > 1) {
    if (tags.includes('shuffle') || tags.includes('random')) {
      data.results = shuffle(data.results).slice(0, 1);
    }
  }

  return data;
}
