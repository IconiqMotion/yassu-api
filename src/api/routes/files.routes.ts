import { Router } from 'express';
import multer from 'multer';
import { uploadFiles } from '../controllers/files.controller';

const upload = multer();

export const router = Router();

router.post('/upload', upload.single('fileToUpload'), uploadFiles);
