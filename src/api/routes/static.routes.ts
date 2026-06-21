import { Router } from 'express';
import multer from 'multer';
import {getAbout, getContactDetails, getTermsOfUse, getPrivacyPolicy, getCookiesPolicy, getCustomerService} from "../controllers/static.controller";
import {webhook, twiml} from 'twilio';
const upload = multer();
const VoiceResponse = twiml.VoiceResponse;

export const router = Router();

router.get('/about', getAbout);
router.get('/terms-of-use', getTermsOfUse);
router.get('/privacy', getPrivacyPolicy);
router.get('/cookies', getCookiesPolicy);
router.get('/contact', getContactDetails);
router.get('/customer-service', getCustomerService);
router.get('/cb', (req, res) => {
    console.log('======')
    console.log(req.body);
    console.log(req.query);
    console.log(req.params);
    console.log('======')
    res.json({message: 'ok'});
})
