/**
 * MinIO Storage Service
 * Dosya yükleme ve yönetimi için merkezi servis
 */

const Minio = require('minio');

class StorageService {
    constructor() {
        this.client = new Minio.Client({
            endPoint: process.env.MINIO_ENDPOINT || 'localhost',
            port: parseInt(process.env.MINIO_PORT || '9000', 10),
            useSSL: process.env.MINIO_USE_SSL === 'true',
            accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
            secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
        });

        this.buckets = {
            SUBMISSIONS: process.env.MINIO_BUCKET_SUBMISSIONS || 'lms-submissions',
            CONTENTS: process.env.MINIO_BUCKET_CONTENTS || 'lms-contents',
            AVATARS: process.env.MINIO_BUCKET_AVATARS || 'lms-avatars'
        };

        this.initBuckets();
    }

    /**
     * Bucketları oluştur
     */
    async initBuckets() {
        try {
            for (const bucket of Object.values(this.buckets)) {
                const exists = await this.client.bucketExists(bucket);
                if (!exists) {
                    await this.client.makeBucket(bucket);
                    console.log(`[MinIO] Bucket created: ${bucket}`);

                    // Public read policy for contents and avatars
                    if (bucket !== this.buckets.SUBMISSIONS) {
                        const policy = {
                            Version: '2012-10-17',
                            Statement: [{
                                Effect: 'Allow',
                                Principal: { AWS: ['*'] },
                                Action: ['s3:GetObject'],
                                Resource: [`arn:aws:s3:::${bucket}/*`]
                            }]
                        };
                        await this.client.setBucketPolicy(bucket, JSON.stringify(policy));
                    }
                }
            }
        } catch (err) {
            console.error('[MinIO] Bucket initialization failed:', err.message);
        }
    }

    /**
     * Dosya yükle
     */
    async uploadFile(bucket, filename, buffer, metadata = {}) {
        try {
            await this.client.putObject(bucket, filename, buffer, buffer.length, metadata);
            return {
                success: true,
                url: await this.getFileUrl(bucket, filename),
                key: filename,
                bucket
            };
        } catch (err) {
            console.error('[MinIO] Upload error:', err);
            throw err;
        }
    }

    /**
     * Dosya URL'i al (Signed URL)
     */
    async getFileUrl(bucket, filename, expiry = 24 * 60 * 60) {
        try {
            return await this.client.presignedGetObject(bucket, filename, expiry);
        } catch (err) {
            console.error('[MinIO] URL generation error:', err);
            throw err;
        }
    }

    /**
     * Dosya sil
     */
    async deleteFile(bucket, filename) {
        try {
            await this.client.removeObject(bucket, filename);
            return true;
        } catch (err) {
            console.error('[MinIO] Delete error:', err);
            throw err;
        }
    }

    /**
     * Bucket içeriğini listele (Dashboard için)
     */
    async listFiles(bucket) {
        return new Promise((resolve, reject) => {
            const stream = this.client.listObjects(bucket, '', true);
            const files = [];

            stream.on('data', (obj) => files.push(obj));
            stream.on('error', (err) => reject(err));
            stream.on('end', () => resolve(files));
        });
    }

    /**
     * Sistem durumu
     */
    async getHealth() {
        try {
            const buckets = await this.client.listBuckets();
            return {
                status: 'up',
                bucketCount: buckets.length,
                buckets: buckets.map(b => b.name)
            };
        } catch (err) {
            return {
                status: 'down',
                error: err.message
            };
        }
    }
}

module.exports = new StorageService();
