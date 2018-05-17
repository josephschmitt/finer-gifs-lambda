export default function formatAttachment(query, {text, fileid}, count, showActions) {
  const image_url = `${process.env.CDN_BASE_URL}/${fileid}.gif`;

  const attachment = {
    title: text,
    image_url,
    fallback: image_url,
    callback_id: fileid,
  };

  const inChannelAttachment = Object.assign({}, attachment, {
    title: `${query} (${count} result${count !== 1 ? 's' : ''})`,
    title_link: `${process.env.SITE_BASE_URL}?q=${query}`,
    text: text,
  });

  if (showActions) {
    return Object.assign(attachment, {
      actions: [
        {name: 'post', type: 'button', text: 'Post', value: JSON.stringify(inChannelAttachment)},
      ],
    });
  }

  return inChannelAttachment;
}
