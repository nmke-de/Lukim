#!/usr/bin/env -S deno run --allow-net

import { Geddit } from "https://github.com/kaangiray26/geddit-app/raw/main/src/js/geddit.js";
import { Server } from "https://deno.land/std@0.196.0/http/server.ts";
import { Marked } from "https://raw.githubusercontent.com/ubersl0th/markdown/master/mod.ts";

const g = new Geddit();
const port = 11100;
const handler = async (request) => {
	const query = request.url.slice(("http://" + request.headers.get("host") + "/").length);
	let subreddit = "";
	if (query.slice(0, 2) == "r/")
		subreddit = query.slice(2);
	const p = (await g.getSubmissions("hot", subreddit)).posts;
	//console.log(p);
	let res = "";
	for (let i = 0; i < p.length; i++) {
		const entry = p[i];
		// console.log(`${entry.data.post_hint}\t${entry.data.title}`)
		// console.log(entry.data.post_hint === undefined ? entry.data : "");
		res += `\t\t<article style='background-color: #f0f0f0;'>
			<h1>${entry.data.title}</h1>
			<author>${entry.data.author}</author>
			<a href="${entry.data.subreddit_name_prefixed}">${entry.data.subreddit_name_prefixed}</a>
			<a href="${entry.data.permalink}">Permalink</a>
			${entry.data.post_hint === "image" ? '<img style="width:100%;" src="' + entry.data.url_overridden_by_dest + '" alt="Reddit Post" />' : ''}
			${entry.data.post_hint === "hosted:video" ? '<video style="width:100%;" controls src="' + entry.data.media.reddit_video.fallback_url + '" alt="Reddit Post" />' : ''}
			${entry.data.post_hint === "rich:video" ? entry.data.media.oembed.html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") : ''}
			<div>${Marked.parse(entry.data.selftext).content}</div>
		</article>\n`;
	}
	let body = `<!doctype html>
<html>
	<head>
		<meta charset=utf8 />
		<title>Title</title>
	</head>
	<body>\n${res}\t</body>
</html>`;
	return new Response(body, {status: 200, headers: {"Content-Type": "text/html"}});
}

const server = new Server({port, handler});
server.listenAndServe();

// console.log((await g.getSubmissions("top", "politicalcompassmemes")).posts[0]);
