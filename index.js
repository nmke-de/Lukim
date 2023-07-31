#!/usr/bin/env -S deno run --allow-net

import { Geddit } from "https://github.com/kaangiray26/geddit-app/raw/main/src/js/geddit.js";
import { Server } from "https://deno.land/std@0.196.0/http/server.ts";
import { Marked } from "https://raw.githubusercontent.com/ubersl0th/markdown/master/mod.ts";

const g = new Geddit();
const port = 11100;

const unescapehtml = (escaped) => escaped.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

const post = (data) => `\t\t<article style='background-color: #f0f0f0;'>
			<h1>${data.title}</h1>
			<author>${data.author}</author>
			<a href="/${data.subreddit_name_prefixed}">${data.subreddit_name_prefixed}</a>
			<a href="${data.permalink}">Permalink</a>
			${data.post_hint === "image" ? '<img style="width:100%;" src="' + data.url_overridden_by_dest + '" alt="Reddit Post" />' : ''}
			${data.post_hint === "hosted:video" ? '<video style="width:100%;" controls src="' + data.media.reddit_video.fallback_url + '" alt="Reddit Post" />' : ''}
			${data.post_hint === "rich:video" ? unescapehtml(data.media.oembed.html) : ''}
			<div>${Marked.parse(data.selftext).content}</div>
		</article>\n`;

const subreddit = async (name, by = "hot") => {
	let res = "";
	const p = (await g.getSubmissions(by, name)).posts;
	for (let i = 0; i < p.length; i++) {
		const entry = p[i];
		res += post(entry.data);
	}
	return res;
};

const gen_comments = (comments, depth = 0) => {
	let res = "";
	// if (depth > 0)
	// 	console.log(comments);
	for (const i in comments) {
		const comment = comments[i];
		// console.log(comment);
		if (comment.kind !== "more") {
			const children = (comment.data.replies ? gen_comments(comment.data.replies.data.children, depth + 1) : '');
			// console.log(children);
			res += `<div class=comment><b>${comment.data.author}:</b> ${unescapehtml(comment.data.body_html)}\n<div>${children}</div>`;
		} else {
			// console.log(comment.data.children)
			res += "more...";
		}
		res += "</div>\n";
	}
	return res;
};

const single_post = async (name, by = "top") => {
	const p = (await g.getSubmissionComments(name));
	const comments = gen_comments(p.comments);
	return post(p.submission.data) + comments;
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
		<style>
			.comment {
				margin: 5px;
				border-left: 5px solid black;
				padding-left: 5px;
			}
		</style
	</head>
	<body>\n${res}\t</body>
</html>`;
	return new Response(body, {status: 200, headers: {"Content-Type": "text/html"}});
}

const server = new Server({port, handler});
server.listenAndServe();
