#!/usr/bin/env -S deno run --allow-net

import { Geddit } from "https://github.com/kaangiray26/geddit-app/raw/main/src/js/geddit.js";
import { Server } from "https://deno.land/std@0.196.0/http/server.ts";
import { Marked } from "https://raw.githubusercontent.com/ubersl0th/markdown/master/mod.ts";

const g = new Geddit();
const port = 11100;

const unescapehtml = (escaped) => escaped ? escaped.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") : "";

const unpreview = (url) => url ? url.split("?")[0].replace("preview", "i") : "";

const remove_style = (styled) => styled.replace(/style=.*?[ "']/g, "");

const gallery = (data) => {
	let paste = "";
	try {
		data.gallery_data.items.map(item => item.media_id).map(media_id => data.media_metadata[media_id].s).map(item => item.u ? unpreview(item.u) : item.gif).forEach(url => paste += `<img src="${url}" alt="${url}" />\n\t\t\t\t`);
	} catch (_) {
		console.log("Empty gallery?!");
	}
	return `<div class=gallery>
				${paste}
			</div>`;
};

const post = (data, comments = "") => `\t\t<article>
			<h1>${data.title}</h1>
			<div class=post-description>
				<a href="/u/${data.author}">${data.author}</a>
				<a href="/${data.subreddit_name_prefixed}">${data.subreddit_name_prefixed}</a>
				<a href="${data.permalink}">Permalink</a>
			</div>
			${data.post_hint === "image" ? '<img src="' + unpreview(data.url_overridden_by_dest) + '" alt="Reddit Post" />' : ''}
			${data.post_hint === "hosted:video" ? '<video id="hosted-video-' + data.name + '" controls src="' + data.media.reddit_video.hls_url + '" alt="Reddit Post"></video><script>addhls(document.getElementById("hosted-video-' + data.name + '"));</script>' : ''}
			${data.post_hint === "rich:video" ? remove_style(unescapehtml(data.media.oembed.html)) : ''}
			${data.post_hint === "link" ? '<a href="' + data.url_overridden_by_dest +'">' + data.url_overridden_by_dest + '</a>' : ''}
			${data.is_gallery ? gallery(data) : ''}
			<div class=md>${unescapehtml(data.selftext_html)}</div>
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

const user = async (name, by = "hot") => {
	let res = "";
	const p = (await g.getUserSubmissions(name, by)).items;
	let meta;
	try {
		meta = unescapehtml((await g.getUser(name)).subreddit.public_description);
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
	console.log(p.submission.data);
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
				else if (part === "u" || part === "user")
					mode = "user";
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
	let tmp = {};
	switch (mode) {
		case "subreddit":
			tmp = await subreddit(name);
			res = tmp.res;
			meta = tmp.meta;
			break;
		case "user":
			tmp = await user(name);
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
			.md-spoiler-text {
				color: #000000;
				background-color: #000000;
			}
			.md-spoiler-text:hover {
				color: #ffffff;
			}
		</style>
		<script src="https://cdn.tutorialjinni.com/hls.js/1.2.1/hls.min.js"></script>
		<script>
			const addhls = (elem) => {
				let hls = new Hls();
				hls.loadSource(elem.src);
				hls.attachMedia(elem);
			};
		</script>
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
