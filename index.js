#!/usr/bin/env -S deno run --allow-net

import { Geddit } from "https://github.com/kaangiray26/geddit-app/raw/main/src/js/geddit.js";
import { Server } from "https://deno.land/std@0.196.0/http/server.ts";
import { Marked } from "https://raw.githubusercontent.com/ubersl0th/markdown/master/mod.ts";

const g = new Geddit();
const port = 11100;

const unescapehtml = (escaped) => escaped ? escaped.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") : "";

const remove_style = (styled) => styled.replace(/style=.*?[ "']/g, "");

const post = (data, comments = "") => `\t\t<article>
			<h1>${data.title}</h1>
			<div class=post-description>
				<author>${data.author}</author>
				<a href="/${data.subreddit_name_prefixed}">${data.subreddit_name_prefixed}</a>
				<a href="${data.permalink}">Permalink</a>
			</div>
			${data.post_hint === "image" ? '<img src="' + data.url_overridden_by_dest + '" alt="Reddit Post" />' : ''}
			${data.post_hint === "hosted:video" ? '<video controls src="' + data.media.reddit_video.fallback_url + '" alt="Reddit Post"></video>' : ''}
			${data.post_hint === "rich:video" ? remove_style(unescapehtml(data.media.oembed.html)) : ''}
			${data.post_hint === "link" ? '<a href="' + data.url_overridden_by_dest +'">' + data.url_overridden_by_dest + '</a>' : ''}
			<div class=md>${Marked.parse(data.selftext).content}</div>
			<div class=comments>${comments}</div>
		</article>\n`;

const subreddit = async (name, by = "hot") => {
	let res = "";
	const p = (await g.getSubmissions(by, name)).posts;
	let meta;
	try {
		meta = unescapehtml((await g.getSubreddit(name)).description_html);
	} catch (exception) {
		meta = "";
	}
	for (let i = 0; i < p.length; i++) {
		const entry = p[i];
		res += post(entry.data);
	}
	return {res, meta};
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
	return post(p.submission.data, comments);
}

const handler = async (request) => {
	const query = request.url.slice(("http://" + request.headers.get("host") + "/").length);
	let name = "";
	let res = "";
	let meta = "";
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
			const tmp = await subreddit(name);
			res = tmp.res;
			meta = tmp.meta;
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
			body {
				background-color: #08082a;
				color: #f8f8d6;
				font-family: sans-serif;
			}
			a, a:visited {
				color: #c7c7ff;
			}
			div.fixbar {
				margin: 0;
				border: 0;
				padding: 5px;
				float: left;
				background-position: fixed;
				position: fixed;
				max-height: 90%;
				max-width: 20%;
				overflow: auto;
			}
			article {
				margin: 5px 25%;
				padding: 1px;
				background-color: #484848;
				background-position: absolute;
				position: static;
			}
			article h1, article .post-description {
				margin: 2px 5px;
				text-align: center;
			}
			video, img, iframe {
				margin: 1%;
				max-width: 98%;
			}
			article div.md {
				margin: 1%;
				text-align: justify;
			}
			.comment {
				margin: 5px;
				border-left: 5px solid black;
				padding-left: 5px;
			}
		</style
	</head>
	<body>
		<div class=fixbar>
			<a href=/><h1>Lukim</h1></a>
			<a href="https://reddit.com/${query}" target=blank>View on Reddit</a>
			<hr />
			${meta}
		</div>\n${res}
	</body>
</html>`;
	return new Response(body, {status: 200, headers: {"Content-Type": "text/html"}});
}

const server = new Server({port, handler});
server.listenAndServe();
