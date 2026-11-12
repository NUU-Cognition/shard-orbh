---
description: "Publish an HTML file as a NUU Artifact (flint orbh artifacts publish): a new artifact or a new version, then pin its URL, keep it in the session as an object, and give the address and the URL in the report"
orbh-fleet: storage-1112
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start orbh` if you haven't already.

# Skill: Publish Artifact

A **NUU Artifact** is one HTML page that NUU Artifacts keeps for an org (or for the personal workspace of a person), with all its versions. A person opens it in the web app `https://artifacts.nuucognition.com/<org>/<id>`, which shows the page in a sandboxed frame. A NUU Artifact is an object of the Objects Protocol: its address is `@v1/<org>/artifact/<id>#artifacts` (one version: `@v1/<org>/artifact/<id>@<n>#artifacts`), and its URI is `nuu://artifacts/artifact/<id>`.

A NUU Artifact is not a Mesh artifact. `flint orbh artifact <id> "<path>"` and the session key `artifacts` record the Mesh files of a session. `flint orbh artifacts …` (with an `s`) is the CLI of NUU Artifacts.

Use this skill when the work makes an HTML page that a person must open: a report, a board, a review page, a demo, or a chart. Publish the page, and give the person its URL. Do not send an HTML file by path when a person on another computer must open it.

# Input

- The HTML file (one file, at most 10 000 000 bytes)
- (Optional) A title and a description. The default title is the text of `<title>` of the file, else the file name.
- (Optional) The org. The default is the org of the Flint (`flint.json#org.slug`), else the personal workspace.
- (Optional) A NUU Artifact that exists, when this file is a new version of it

# Rules

1. **One file, self-contained.** NUU Artifacts keeps one HTML file for each version. Put the CSS and the scripts in the file. Give each image as a `data:` URI or as an absolute `https://` URL. A relative link to another file does not work.
2. **The page runs in a sandbox.** The frame has no same origin: the page cannot read the cookies of `nuucognition.com`, and its requests are cross-site. Do not put a secret or a token in the page: each member of the org can read the source.
3. **A new version, not a new artifact.** When the file is a new version of a page that you published before, publish with `--update <address>`. Only the owner of the artifact (the person who published it first) or an org owner or admin can publish a new version.
4. **Keep the source file.** The NUU Artifact is the published copy. Keep the HTML file in the Flint when it is finished work (for example under `Media/Reports/`), or in the scratch folder of the session when it is a draft.
5. **This skill does not style the page.** Write the page with the rules of the work. A later program gives the style of a NUU Artifact.

# Actions

1. **Check the file.** It is one `.html` file of at most 10 000 000 bytes, and it has a `<title>`. Open it in a browser when you can, and check that it shows with no other file.
2. **Find an earlier version.** When the work published this page before, find its address: the report or the task of the work, the `OBJECTS` block of your Page, or `flint orbh artifacts list --mine --query "<words of the title>" --json`.
3. **Publish.**

   ```bash
   flint orbh artifacts publish "<file.html>" --title "<title>" [--description "<text>"] [--org <slug> | --personal] --json            # a new NUU Artifact
   flint orbh artifacts publish "<file.html>" --update "<address>" --json                                                              # a new version
   ```

   The output gives the title, the version, the address, and the URL. With `ORBH_SESSION_ID` set, the CLI also adds the NUU Artifact to the session as an object (`Object: added to session <id>`). `--no-add` stops that add.
4. **Check the object.** The output has one of three lines. `Object: added to session <id>`: correct. `Object: session <id> holds it already (<item>)`: correct after a new version. `Warning: the object was not added to session <id>: <reason>` (on stderr): the publish is done; add the object yourself with `flint orbh objects add "<address>"`.
5. **Pin the URL**, so that the person opens it from the Orbh menu: `flint helper pins add "<url>" --name "<title>"`. After a new version the URL does not change: keep the pin.
6. **Record it.** Write the address and the URL in the Mesh file of the work (the report, the task note, or the notepad), and in the result of the turn. For an Ops task, a short comment can give the URL: `ops comment add <task> "<title>: <url>"`.

# Other Verbs

```bash
flint orbh artifacts list [--org <slug> | --personal] [--mine] [--query <text>] [--limit <n>] [--json]   # newest first
flint orbh artifacts get "<address>" [--version <n>] [--json]                       # the facts
flint orbh artifacts get "<address>" --source [--version <n>]                       # the HTML on stdout
flint orbh artifacts get "<address>" --out "<file.html>" [--version <n>]            # the HTML into a file
flint orbh artifacts open "<address>" [--version <n>] [--print]                     # open the web URL (--print: only print it)
flint orbh artifacts versions "<address>" [--json]                                  # each version: number, size, SHA-256, time, author
flint orbh artifacts delete "<address>" --yes [--json]                              # a soft delete; ask the person first
```

Each verb takes the id, the address, or the URI. The object verbs work on a NUU Artifact too: `flint orbh objects get "<address>"` (the facts and the source, cut at 40 000 characters), and `flint orbh objects use "<address>" rename_artifact --title "<title>"`. The tools are `read_source`, `publish_version`, `rename_artifact`, and `publish_artifact`; `flint orbh objects tools "<address>"` lists them. Use the CLI to publish a file: the tool `publish_version` takes at most 2 000 000 characters.

# Errors

| Code | What to do |
|---|---|
| `unauthenticated` | No sign-in. Ask the person to run `nuu login`. A headless session cannot sign in: report it. |
| `forbidden` | `--update` of an artifact that you do not own. Publish a new NUU Artifact, or ask the owner. |
| `not-found` | The artifact does not exist, or you are not a member of its org. Check the address. |
| `too-large` | The file is larger than 10 000 000 bytes. Make it smaller (smaller images, less data). |
| `hash-mismatch`, `upload-missing` | The upload did not arrive whole. Publish again one time. |
| `limit` | Too many requests. Wait, then publish again one time. |
| `not-configured` | NUU Artifacts has no storage for this mode. Report it with the command. |

The exit code is 0 for success, 1 for a refusal of the server or a failed request, and 2 for a wrong command line. A delete in a terminal asks for a confirmation; with no terminal, `--yes` is required. Delete a NUU Artifact only when the person asks.

# Output

- The address and the URL of the NUU Artifact, and its version
- The NUU Artifact as an object of the session, and its URL as a pin
- The address and the URL in the Mesh file of the work and in the result
