import express, {Request, Response}  from "express";
import { registerUser,loginUser } from "../controllers/auth.controller";
import { verifyToken } from "../middleware/auth.middleware";


const router = express.Router();

router.post("/register",registerUser );
router.post("/login",loginUser);
router.get("/protected",verifyToken,(req:Request,res:Response)=>{
      res.json({message:"Access granted"});
});
 export default router