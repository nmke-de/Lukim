#!/usr/bin/env -S deno run --allow-net

import { Geddit } from "https://github.com/kaangiray26/geddit-app/raw/main/src/js/geddit.js";
import { Server } from "https://deno.land/std@0.196.0/http/server.ts";
import { Marked } from "https://raw.githubusercontent.com/ubersl0th/markdown/master/mod.ts";

const g = new Geddit();
const port = 11100;

const post = (data) => `\t\t<article style='background-color: #f0f0f0;'>
			<h1>${data.title}</h1>
			<author>${data.author}</author>
			<a href="/${data.subreddit_name_prefixed}">${data.subreddit_name_prefixed}</a>
			<a href="${data.permalink}">Permalink</a>
			${data.post_hint === "image" ? '<img style="width:100%;" src="' + data.url_overridden_by_dest + '" alt="Reddit Post" />' : ''}
			${data.post_hint === "hosted:video" ? '<video style="width:100%;" controls src="' + data.media.reddit_video.fallback_url + '" alt="Reddit Post" />' : ''}
			${data.post_hint === "rich:video" ? data.media.oembed.html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") : ''}
			<div>${Marked.parse(data.selftext).content}</div>
		</article>\n`;

const subreddit = async (name, by = "hot") => {
	let res = "";
	const p = (await g.getSubmissions(by, name)).posts;
	for (let i = 0; i < p.length; i++) {
		const entry = p[i];
		// console.log(`${entry.data.post_hint}\t${entry.data.title}`)
		// console.log(entry.data.post_hint === undefined ? entry.data : "");
		res += post(entry.data);
	}
	return res;
};

const single_post = async (name, by = "top") => {
	const p = (await g.getSubmission(`t3_${name}`));
	return post(p);
}

const handler = async (request) => {
	const query = request.url.slice(("http://" + request.headers.get("host") + "/").length);
	let name = "";
	let res = "";
	const query_parts = query.split("/");
	let mode = "initial";
	for(let i = 0; i < query_parts.length; i++) {
		const part = query_parts[i];
		switch (i) {
			case 0:
				if (part === "r" || part === "")
					mode = "subreddit";
				break;
			case 1:
				name = part;
				break;
			case 2:
				if (part === "comments")
					mode = "post";
				break;
			case 3:
				name = part;
				break;
			default:
				continue;
		}
	}
	switch (mode) {
		case "subreddit":
			res = await subreddit(name);
			break;
		case "post":
			res = await single_post(name);
			break;
		default:
			res = "Not found. / Not implemented.";
	}
	let body = `<!doctype html>
<html>
	<head>
		<meta charset=utf8 />
		<title>Lukim</title>
	</head>
	<body>\n${res}\t</body>
</html>`;
	return new Response(body, {status: 200, headers: {"Content-Type": "text/html"}});
}

const server = new Server({port, handler});
server.listenAndServe();

// console.log((await g.getSubmissions("top", "politicalcompassmemes")).posts[0]);
