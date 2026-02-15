#!/usr/bin/env node
/**
 * Migrate pins from Google Maps saved places to Platinum DoorKnock backend.
 * Preserves original timestamps and notes.
 * 
 * Usage: node migrate_pins.js
 */

const SCRIPT_BASE = "https://script.google.com/macros/s/AKfycbz3GOYhhmOL7zG1YailUatYyBHAK3jmTGMaafOGmmeDSgWgmIrW52pXZek2Ffeq0IPrfA/exec";
const MAPS_KEY = "AIzaSyAzfIev2fEMKIa0bDe7FWwqb7lOrhVLstM";

const PINS = [
    // ===== 8/24/25 PHX storm (16 places) =====
    {
        address: "2140 E Georgia Ave, Phoenix, AZ 85016",
        note: "Looks vacant significant shingles missing Toledo",
        status: "Damage",
        substatus: "Shingles Missing",
        user: "Paris",
        ts: "2025-08-24T10:00:00.000Z",
        source: "8/24/25 PHX storm"
    },
    {
        address: "30859 N 118th Ln, Peoria, AZ 85383",
        note: "Huge damaged sandcastle blackstone cc",
        status: "Damage",
        substatus: "Shingles",
        user: "Paris",
        ts: "2025-08-24T10:15:00.000Z",
        source: "8/24/25 PHX storm"
    },
    {
        address: "7736 N 4th Ave, Phoenix, AZ 85021",
        note: "7th st. Northern big houses trees down",
        status: "Damage",
        substatus: "Trees Down",
        user: "Paris",
        ts: "2025-08-24T10:30:00.000Z",
        source: "8/24/25 PHX storm"
    },
    {
        address: "9863 W Sun Valley Dr, Sun City, AZ 85351",
        note: "By grand bigger shingle good damage",
        status: "Damage",
        substatus: "Shingles",
        user: "Paris",
        ts: "2025-08-24T10:45:00.000Z",
        source: "8/24/25 PHX storm"
    },
    {
        address: "14006 W Aleppo Dr, Sun City West, AZ 85375",
        note: "Sun city st - multiple trees down - multi shingle damage laminate",
        status: "Damage",
        substatus: "Laminate",
        user: "Paris",
        ts: "2025-08-24T11:00:00.000Z",
        source: "8/24/25 PHX storm"
    },
    {
        address: "4728 W Villa Rita Dr, Glendale, AZ 85308",
        note: "Ode - long time renter studio leaks lookup online renter Canada - call 602-918-7379",
        status: "Conversation",
        substatus: "Renter",
        user: "Paris",
        ts: "2025-08-24T11:15:00.000Z",
        source: "8/24/25 PHX storm"
    },
    {
        address: "17621 N 42nd St, Phoenix, AZ 85032",
        note: "3tab big trees renter vet, owner owns multiple properties, has home warranty too. Guy leaving end of aug- check back to get owner contact info",
        status: "Conversation",
        substatus: "Renter",
        user: "Paris",
        ts: "2025-08-24T11:30:00.000Z",
        source: "8/24/25 PHX storm"
    },
    {
        address: "17650 N 41st Pl, Phoenix, AZ 85032",
        note: "Tore back 3 tab",
        status: "Damage",
        substatus: "3 Tab",
        user: "Paris",
        ts: "2025-08-24T11:45:00.000Z",
        source: "8/24/25 PHX storm"
    },
    {
        address: "4149 E Campo Bello Dr, Phoenix, AZ 85032",
        note: "NorCal buy - foster pretty Pitt - 3 tab just bought house 1.5 years ago",
        status: "Conversation",
        substatus: "Homeowner",
        user: "Paris",
        ts: "2025-08-24T12:00:00.000Z",
        source: "8/24/25 PHX storm"
    },
    {
        address: "W Augusta Cir, Glendale, AZ",
        note: "Bryce said good spot Glendale better winds",
        status: "Quick Knock",
        substatus: "Area Scout",
        user: "Paris",
        ts: "2025-08-24T12:15:00.000Z",
        source: "8/24/25 PHX storm"
    },
    {
        address: "7017 N 12th St, Phoenix, AZ 85020",
        note: "Big church shingles",
        status: "Damage",
        substatus: "Shingles",
        user: "Paris",
        ts: "2025-08-24T12:30:00.000Z",
        source: "8/24/25 PHX storm"
    },
    {
        address: "17813 N 42nd Pl, Phoenix, AZ 85032",
        note: "Roof tore off laminate and underlayment from storm",
        status: "Damage",
        substatus: "Laminate",
        user: "Paris",
        ts: "2025-08-24T12:45:00.000Z",
        source: "8/24/25 PHX storm"
    },
    {
        address: "17401 N 59th Pl, Scottsdale, AZ 85254",
        note: "Great pocket large shingle this one older lots of trees",
        status: "Damage",
        substatus: "Shingles",
        user: "Paris",
        ts: "2025-08-24T13:00:00.000Z",
        source: "8/24/25 PHX storm"
    },
    {
        address: "5375 E Wallace Ave, Scottsdale, AZ 85254",
        note: "Robert Romanian contractor accent farmers 3 tab w few panels, smoked",
        status: "Conversation",
        substatus: "Homeowner",
        user: "Paris",
        ts: "2025-08-24T13:15:00.000Z",
        source: "8/24/25 PHX storm"
    },
    {
        address: "5222 E Aire Libre Ave, Scottsdale, AZ 85254",
        note: "Natalie - State Farm- totaled",
        status: "Inspection",
        substatus: "Scheduled",
        user: "Paris",
        ts: "2025-08-24T13:30:00.000Z",
        source: "8/24/25 PHX storm"
    },
    {
        address: "5201 E Grandview Rd, Scottsdale, AZ 85254",
        note: "Dec t size 2 story shingle missing several shingles in storm",
        status: "Damage",
        substatus: "Shingles Missing",
        user: "Paris",
        ts: "2025-08-24T13:45:00.000Z",
        source: "8/24/25 PHX storm"
    },

    // ===== 8/25/25 dust storm PHX (8 places) =====
    {
        address: "2402 E Shangri La Rd, Phoenix, AZ 85028",
        note: "Flat in Andy's neighborhood- name is Mike. Just dropped 12k on ac. Knows he needs recoat/scarify - no storm damage- lots of small holes woodpeckers maybe- large trees around. Asked for estimate",
        status: "Conversation",
        substatus: "Homeowner",
        user: "Paris",
        ts: "2025-08-25T09:00:00.000Z",
        source: "8_25_25 dust storm PHX"
    },
    {
        address: "7120 N 9th St, Phoenix, AZ 85020",
        note: "Weird disco concrete tile weird foam on back missing multiple tiles trees down",
        status: "Damage",
        substatus: "Tile",
        user: "Paris",
        ts: "2025-08-25T09:30:00.000Z",
        source: "8_25_25 dust storm PHX"
    },
    {
        address: "6846 N 11th Ave, Phoenix, AZ 85013",
        note: "Tore back blue laminate. Statues of Dino etc in yard. Locked gate couldn't knock",
        status: "Quick Knock",
        substatus: "No Answer",
        user: "Paris",
        ts: "2025-08-25T10:00:00.000Z",
        source: "8_25_25 dust storm PHX"
    },
    {
        address: "4340 N Arcadia Ln, Phoenix, AZ 85018",
        note: "Sandy at least 2 tiles broke",
        status: "Damage",
        substatus: "Tile",
        user: "Paris",
        ts: "2025-08-25T10:30:00.000Z",
        source: "8_25_25 dust storm PHX"
    },
    {
        address: "2240 E Georgia Ave, Phoenix, AZ 85016",
        note: "Drone inspection w Jake broken tiles every slope",
        status: "Inspection",
        substatus: "Completed",
        user: "Paris",
        ts: "2025-08-25T11:00:00.000Z",
        source: "8_25_25 dust storm PHX"
    },
    {
        address: "5225 N 23rd St, Phoenix, AZ 85016",
        note: "Huge clay w tree branch puncture on n slope. Renter said owner might do work, renter name is Ben and is realtor. Ben 707-338-7828.",
        status: "Conversation",
        substatus: "Renter",
        user: "Paris",
        ts: "2025-08-25T11:30:00.000Z",
        source: "8_25_25 dust storm PHX"
    },
    {
        address: "2140 E Georgia Ave, Phoenix, AZ 85016",
        note: "Looks vacant significant shingles missing Toledo",
        status: "Damage",
        substatus: "Shingles Missing",
        user: "Paris",
        ts: "2025-08-25T12:00:00.000Z",
        source: "8_25_25 dust storm PHX"
    },
    {
        address: "5201 N 21st St, Phoenix, AZ 85016",
        note: "Massive slate w damage",
        status: "Damage",
        substatus: "Slate",
        user: "Paris",
        ts: "2025-08-25T12:30:00.000Z",
        source: "8_25_25 dust storm PHX"
    }
];

async function geocode(address) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${MAPS_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
        const loc = data.results[0].geometry.location;
        return { lat: loc.lat, lng: loc.lng, formatted: data.results[0].formatted_address };
    }
    console.warn(`  ⚠️  Could not geocode: ${address}`);
    return null;
}

async function postPin(pin, coords) {
    const payload = {
        address: coords.formatted || pin.address,
        lat: coords.lat,
        lng: coords.lng,
        status: pin.status,
        substatus: pin.substatus || "",
        note: pin.note.slice(0, 120),
        user: pin.user,
        device: "migration",
        source: pin.source,
        ts: pin.ts
    };

    const url = `${SCRIPT_BASE}?mode=log`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
    });
    const result = await res.json();
    return result;
}

async function main() {
    console.log(`\n🚀 Migrating ${PINS.length} pins to Platinum DoorKnock...\n`);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < PINS.length; i++) {
        const pin = PINS[i];
        process.stdout.write(`[${i + 1}/${PINS.length}] ${pin.address.substring(0, 50)}... `);

        // Geocode
        const coords = await geocode(pin.address);
        if (!coords) {
            console.log("❌ GEOCODE FAILED");
            failed++;
            continue;
        }

        // Post to backend
        try {
            const result = await postPin(pin, coords);
            if (result.ok) {
                console.log(`✅ pin_id: ${result.pin_id}`);
                success++;
            } else {
                console.log(`❌ ${result.error || "Unknown error"}`);
                failed++;
            }
        } catch (e) {
            console.log(`❌ ${e.message}`);
            failed++;
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 1500));
    }

    console.log(`\n📊 Migration complete: ${success} succeeded, ${failed} failed out of ${PINS.length} total.\n`);
}

main().catch(console.error);
