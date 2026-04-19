const axios = require('axios');
const fs = require('fs');

const urls = [
    "http://Selenite.cc",
    "https://g-65j.pages.dev/projects",
    "https://fmhy.net/",
    "https://uunnblockedgames.weebly.com/bloons-tower-defense-5---works.html",
    "https://vapor.onl/",
    "https://splash.best/",
    "https://infamous.qzz.io/",
    "https://programming.writing.lecture.learning.literature.mybgarage.cl/",
    "https://chips.moktanram.com.np/g.html",
    "https://ismenirbytesm.gerenna.com/",
    "https://learn.gls-drone-pilot.com/",
    "https://daydreamx.global.ssl.fastly.net/",
    "https://dtxb.eclipsecastellon.net/",
    "https://s3.amazonaws.com/ghst/index.html",
    "https://school.agreca.com.ar/",   
    "https://noterplusbunny52.b-cdn.net/",
    "https://thesymiproject.org/",
    "https://pluh.aletiatours.com/",
    "https://keoffical.oneapp.dev/",
    "https://follownirbytes-ynevj.ns8.org/",
    "https://endis.rest/",
    "https://helptired8.notinthearchives.net/",
    "https://everest.rip/",
    "https://www.korona.lat/",
    "https://play.frogiee.one/",
    "https://ubghub.org/",
    "https://pizagame.com/",
    "https://startmyeducation.top/",
    "https://byod.geeked.wtf/"
];

async function scan() {
    console.log(`Scanning ${urls.length} target interfaces...`);
    const results = [];
    
    await Promise.all(urls.map(async (url) => {
        try {
            const res = await axios.get(url, { 
                timeout: 5000, 
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
            });
            const html = res.data;
            let titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : "Unknown Title";
            
            // Look for proxy artifacts
            const hasUv = html.includes('uv.bundle.js') || html.includes('__uv$config');
            const hasScramjet = html.includes('scramjet.worker.js') || html.includes('__scramjet');
            const hasRammerhead = html.includes('rammerhead.js');
            const hasCloak = html.includes('cloak') || html.includes('about:blank') || html.includes('panickey');
            
            // Look for frameworks
            const hasTailwind = html.includes('tailwind');
            const hasReact = html.includes('data-reactroot') || html.includes('react');
            const hasVite = html.includes('vite.config.js') || html.includes('data-v-');
            
            results.push({
                url,
                status: res.status,
                title,
                proxy: hasUv ? 'Ultraviolet' : (hasScramjet ? 'Scramjet' : (hasRammerhead ? 'Rammerhead' : 'None detected')),
                hasCloak,
                tech: {
                    tailwind: hasTailwind,
                    react: hasReact,
                    vite: hasVite
                }
            });
        } catch (e) {
            results.push({
                url,
                error: e.code || e.message
            });
        }
    }));
    
    fs.writeFileSync('c:/Users/noahm/Downloads/STRATO/comp_analysis.json', JSON.stringify(results, null, 2));
    console.log("Analysis saved to comp_analysis.json");
}

scan();
