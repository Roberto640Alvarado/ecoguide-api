import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

/**
 * Sube archivos a Cloudinary. No persiste nada en base de datos: los demás
 * módulos (ProtectedAreas, FlashCards, etc.) solo guardan la URL resultante
 * en sus propios campos `images`/`imageUrl`, como indica el schema de Prisma.
 */
@Injectable()
export class UploadFilesService {
  constructor(configService: ConfigService) {
    cloudinary.config({
      cloud_name: configService.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: configService.getOrThrow<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    const result = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder, resource_type: 'image' },
          (error, uploadResult) => {
            if (error || !uploadResult) {
              reject(
                error instanceof Error
                  ? error
                  : new InternalServerErrorException(
                      'No se pudo subir la imagen a Cloudinary.',
                    ),
              );
              return;
            }

            resolve(uploadResult);
          },
        );

        uploadStream.end(file.buffer);
      },
    );

    return result.secure_url;
  }
}
