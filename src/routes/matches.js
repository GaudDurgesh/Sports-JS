import { Router } from "express";
import { createMatchSchema } from "../validation/matches.js";
import { matches } from "../db/schema.js";
import { db } from "../db/db.js";
import { listMatchesQuerySchema } from "../validation/matches.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc } from "drizzle-orm";

export const matchRouter = Router(); 

const MAX_LIMIT  = 100;

matchRouter.get('/', async (req , res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query);
    if(!parsed.success){
        return res.status(400).json({error: 'Invalid Query Parameters' , details: JSON.stringify(parsed.error)})
    }
    // res.status(200).json({data : parsed.data})

    const limit = Math.min(parsed.data.limit ?? 50 , MAX_LIMIT) // Set a maximum limit to prevent abuse

    try {
       const data = await db.select().from(matches).orderBy((desc(matches.createdAt))).limit(limit) 
       res.json({data})
    } catch (e) {
        res.status(500).json({error: 'Failed to List Matches'})
        
    }
})

matchRouter.post('/', async (req , res) => {
    const parsed = createMatchSchema.safeParse(req.body);
    const {data: {startTime , endTime , homeScore , awayScore}} = parsed

    if(!parsed.success){
        return res.status(400).json({error: 'Invalid Payload' , details: JSON.stringify(parsed.error)})
        
    }

    try {
        const [event] = await db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status: getMatchStatus(startTime , endTime),
        }).returning()
        res.status(201).json({data : event })
    } catch (e) {
        res.status(500).json({error: 'Failed to create match.' , details: JSON.stringify(e)})
        
    }
})





