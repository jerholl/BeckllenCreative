const query = `*[_type == "post"] | order(coalesce(publishedAt, _createdAt) desc) {
    "slug": slug.current, title,
    "excerpt": pt::text(body)[0..200],
    "image": mainImage.asset->url,
    "category": categories[0]->title,
    "date": coalesce(publishedAt, _createdAt)
}`;

fetch('https://1bc130p1.api.sanity.io/v2024-02-24/data/query/production?query=' + encodeURIComponent(query))
    .then(r => r.json())
    .then(d => console.log(JSON.stringify(d, null, 2)))
    .catch(console.error);
