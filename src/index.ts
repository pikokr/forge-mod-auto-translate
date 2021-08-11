import inquirer from "inquirer"
import * as fs from "fs"
import unzip from "unzipper"
import dotenv from "dotenv"
import translate from "@vitalets/google-translate-api"
import cliProgress from "cli-progress"
import zip from "jszip"
import _ from "lodash"

inquirer
    .prompt(
        [
            {
                message: "업데이트할 jar파일 위치",
                type: "input",
                name: "to",
            },
            {
                message: "언어 데이터를 불러올 jar파일 위치",
                name: "from",
                type: "input",
            },
        ],
        {
            to: "/mnt/c/Users/pikokr/curseforge/minecraft/Instances/RhomyuPacks/mods/TConstruct-1.16.5-3.1.1.252.jar",
            from: "/mnt/c/Users/pikokr/curseforge/minecraft/Instances/RhoMuPACK 1.12.2/mods/TConstruct-1.12.2-2.13.0.183.jar",
        }
    )
    .then(async ({ from, to }: { from: string; to: string }) => {
        const fromZip = fs
            .createReadStream(from)
            .pipe(unzip.Parse({ forceStream: true }))
        let fromLang: any
        let isFromFileJSON = false

        for await (const item of fromZip) {
            if (item.path.endsWith("ko_kr.lang")) {
                fromLang = dotenv.parse(await item.buffer())
            } else if (item.path.endsWith("ko_kr.json")) {
                fromLang = JSON.parse(await item.buffer().toString())
                isFromFileJSON = true
            } else {
                item.autodrain()
            }
        }

        const toZip = fs
            .createReadStream(to)
            .pipe(unzip.Parse({ forceStream: true }))

        let toLang: any

        let isToFileJSON = false

        let filename

        for await (const item of toZip) {
            if (item.path.endsWith("en_us.lang")) {
                toLang = dotenv.parse(await item.buffer())
                filename = item.path
            } else if (item.path.endsWith("en_us.json")) {
                toLang = JSON.parse(await item.buffer())
                isToFileJSON = true
                filename = item.path
            } else {
                item.autodrain()
            }
        }

        if (!fromLang || !toLang)
            return console.log("언어 파일을 찾을 수 없습니다.")

        const keys = Object.keys(toLang)

        const bar = new cliProgress.SingleBar({
            format: "{bar} {value}/{total}",
            barCompleteChar: "\u2588",
            barIncompleteChar: "\u2591",
            hideCursor: true,
        })

        // bar.start(keys.length, 0)

        let result: { [K: string]: string } = {}

        let chunks: string[][] = [[]]

        let len = 0

        for (const key of keys) {
            const value = toLang[key]
            let currentChunk = chunks[chunks.length - 1]
            if (
                currentChunk.length &&
                len + value.length + currentChunk.length > 5000
            ) {
                currentChunk = []
                len = 0
                chunks.push(currentChunk)
            }
            len += value.length
            currentChunk.push(value)
        }

        let translated

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i]
            const data = await translate(chunk.join("\n"), {
                from: "en",
                to: "ko",
            })

            console.log(data.text)
        }

        // await Promise.all(
        //     keys.map(async (key) => {
        //         let current = fromLang[key]
        //
        //         // if (!current) {
        //         //     const value = toLang[key]
        //         //
        //         //     const translated = await translate(value, { to: "ko" })
        //         //
        //         //     current = translated.text
        //         // }
        //
        //         result[key] = current
        //
        //         bar.increment()
        //     })
        // )

        bar.stop()

        const jarFile = await zip.loadAsync(fs.readFileSync(to))

        if (isToFileJSON) {
            const data = JSON.stringify(result)
            let name = filename.split("/")
            name[name.length - 1] = "ko_kr.json"
            console.log(data)
            console.log(name)
            jarFile.file(filename, data)
        } else {
            const data = (_.chunk(Object.entries(result), 2) as any[])
                .map((x: any) => x.join("="))
                .join("\n")

            let name = filename.split("/")
            name[name.length - 1] = "ko_kr.lang"
            console.log(data)
            console.log(name)
            jarFile.file(name.join("/"), data)
        }

        fs.writeFileSync(
            "out.jar",
            await jarFile.generateAsync({
                type: "nodebuffer",
            })
        )
    })
