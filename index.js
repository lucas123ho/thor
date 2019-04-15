const readLineSync = require('readline-sync')
const axios = require('axios')
const open = require('open')

function start() {
    init()
        .then(askMovieName)
        .then(askBrowser)
        .then(includeSites)
        .then(includeSitesWithSearchTerm)
        .then(getResponses)
        .then(breakHTML)
        .then(onlyImportant)
        .then(getOnlyLinks)
        .then(acessLinks)
        .then(getMagnetLinks)
        .then(askMagnetLink)
        .catch(err => console.log("Tchau!"))
    // .then(printResult)

    function init() {
        return new Promise((resolve) => {
            const content = {}
            return resolve(content)
        })
    }

    function askMovieName(content) {
        return new Promise((resolve) => {
            let movieName = readLineSync.question('What movie name: ')
            movieNameNoral = movieName
            movieName = movieName.replace(' ', '%20')
            content.movieName = movieName
            content.movieNameNoral = movieNameNoral
            resolve(content)
        })
    }

    function askBrowser(content) {
        return new Promise((resolve, rejected) => {
            const browsers = ["Chrome", 'Firefox']
            const selectedBrowserIndex = readLineSync.keyInSelect(browsers, "What is your browser: ")
            const selectedBrowserText = browsers[selectedBrowserIndex] ? browsers[selectedBrowserIndex] : false
            if (selectedBrowserText) {
                content.browser = selectedBrowserText.toLowerCase()
                return resolve(content)
            } else {
                return rejected()
            }
        })
    }

    function includeSites(content) {
        return new Promise((resolve) => {
            const sites = require('./sites')
            content.sites = sites
            return resolve(content)
        })
    }

    function includeSitesWithSearchTerm(content) {
        return new Promise((resolve) => {
            const sitesWithSearchTerm = []
            content.sites.forEach(site => {
                const searchTerm = site.searchTerm.replace('{movie}', content.movieName)
                const completeURL = `${site.url}${searchTerm}`
                sitesWithSearchTerm.push(completeURL)
            })
            content.sitesWithSearchTerm = sitesWithSearchTerm
            return resolve(content)
        })
    }

    async function getResponses(content) {
        const responses = []
        for (let i = 0; i < content.sitesWithSearchTerm.length; i++) {
            const html = await axios.get(content.sitesWithSearchTerm[i])
            responses.push(html.data)
        }
        content.originalHTMLs = responses
        return content
    }

    function breakHTML(content) {
        return new Promise((resolve) => {
            const HTMLsBroken = []
            content.originalHTMLs.forEach(html => {
                const HTMLBroken = html.split('>').map(el => el + '>')
                HTMLsBroken.push(HTMLBroken)
            })
            content.htmls = HTMLsBroken
            return resolve(content)
        })
    }

    function onlyImportant(content) {
        return new Promise((resolve) => {
            const importants = []
            content.htmls.forEach((html, index) => {
                const onlyImportant = []
                html.forEach(tag => {
                    let relevance = 0
                    const movieName = content.movieNameNoral
                    const movieNameSplit = movieName.split(' ')
                    if (tag.indexOf(movieName) != -1) {
                        relevance += 2
                    } else {
                        const percent = 1 / movieNameSplit.length
                        movieNameSplit.forEach(word => {
                            if (tag.indexOf(word) != -1) {
                                relevance += percent
                            }
                        })
                    }

                    if (tag.indexOf(`href=`) != -1 && tag.indexOf(content.sites[index].url) != -1) {
                        relevance += 1
                    }

                    if (relevance > 0) {
                        onlyImportant.push({ content: tag, relevance })
                    }
                })
                onlyImportant.sort((a, b) => {
                    return a.relevance - b.relevance
                })
                onlyImportant.reverse()
                importants.push(onlyImportant)
            })
            content.tagsByRelevance = importants
            return resolve(content)
        })
    }

    function getOnlyLinks(content) {
        return new Promise((resolve) => {
            const tagsImoportants = content.tagsByRelevance
            const links = []
            let count = 0
            tagsImoportants.forEach(tags => {
                tags.forEach(tag => {
                    if (tag.content.indexOf(`href=`) != -1 && count <= 5) {
                        const onlyLink = tag.content.split('href=')[1].split('"')[1]
                        links.push(onlyLink)
                        count++
                    }
                })
                count = 0
            })
            content.links = links
            return resolve(content)
        })
    }

    async function acessLinks(content) {
        const responses = []
        for (let i = 0; i < content.links.length; i++) {
            try {
                const html = await axios.get(content.links[i])
                responses.push(html.data)
            } catch (err) {

            }
        }
        content.responsesOnLinks = responses
        return content
    }

    function getMagnetLinks(content) {
        return new Promise((resolve) => {
            const contents = content.responsesOnLinks
            const links = []
            const relevants = contents.filter((html, index) => {
                if (html.indexOf("magnet") != -1) {
                    links.push(content.links[index])
                    return true
                }
            })
            const magnetLinks = []
            relevants.forEach((html, index) => {
                const HTMLBroken = html.split('>').map(el => el + '>')
                const magnetLink = HTMLBroken.filter(tag => tag.indexOf("magnet") != -1).map(tag => {
                    return tag.split('href')[1].split('"')[1]
                })
                magnetLinks.push({ url: links[index], links: magnetLink })
            })
            magnetLinks.sort((a, b) => {
                return a.links.length - b.links.length
            })
            magnetLinks.reverse()
            content.magnetLinks = magnetLinks
            return resolve(content)
        })
    }

    function askMagnetLink(content) {
        return new Promise((resolve, reject) => {
            const urls = content.magnetLinks.map(magnetLink => magnetLink.url)
            const titles = urls.map(url => {
                const firstMovieName = content.movieNameNoral.split(" ")[0]
                const title = firstMovieName + url.split(firstMovieName)[1]
                return title
            })

            while (true) {
                const selectedTitleIndex = readLineSync.keyInSelect(titles, "Choise one: ")
                const links = content.magnetLinks[selectedTitleIndex].links ? content.magnetLinks[selectedTitleIndex].links : false
                if (links) {
                    const selectedLinkIndex = readLineSync.keyInSelect(links, "Choice a magnet link: ")
                    const magnetLink = links[selectedLinkIndex] ? links[selectedLinkIndex] : false
                    if(magnetLink){
                        open(magnetLink, { app: content.browser })
                    }else{
                        reject()
                    }
                    
                }else{
                    reject()
                }

            }





        })
    }

    function printResult(content) {
        console.log(content)
    }
}

start()

