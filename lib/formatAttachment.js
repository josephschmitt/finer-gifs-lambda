export default function formatAttachment(query, {text, fileid}, count, showActions, user_id) {
  const image_url = `${process.env.CDN_BASE_URL}/${fileid}.gif`;

  const name = user_id && `<@${user_id}>`;
  const searchQuery = `${query} (${count} result${count !== 1 ? 's' : ''})`;
  const queryLink = `${process.env.SITE_BASE_URL}?q=${query}`;
  const pretext = (name ? `${name}: ` : '') + `<${queryLink}|${searchQuery})>`;

  const attachment = {
    title: text,
    title_link: image_url,
    image_url,
    fallback: image_url,
    callback_id: fileid,
  };

  const inChannelAttachment = Object.assign({}, attachment, {
    pretext,
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
