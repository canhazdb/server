import { execa } from 'execa';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

async function downloadNats(version: string): Promise<void> {
  const platform = os.platform();
  const arch = os.arch();
  const natsArch = arch === 'x64' ? 'amd64' : arch;

  const baseUrl = 'https://github.com/nats-io/nats-server/releases/download';
  const fileName = `nats-server-${version}-${platform}-${natsArch}.zip`;
  const downloadUrl = `${baseUrl}/${version}/${fileName}`;

  const downloadDir = path.join('/tmp', 'downloads');
  const natsDir = path.join(downloadDir, 'nats');
  await fs.mkdir(natsDir, { recursive: true });

  const outputPath = path.join(downloadDir, fileName);

  try {
    console.log(`Downloading NATS ${version} for ${platform}-${natsArch}...`);
    await execa('curl', ['-L', '-o', outputPath, downloadUrl]);

    console.log('Extracting...');
    // Extract directly to the 'nats' directory
    await execa('unzip', ['-o', outputPath, '-d', natsDir]);

    // Remove the zip file
    await fs.unlink(outputPath);

    // Move contents from the version-specific directory to the 'nats' directory
    const extractedDir = path.join(natsDir, `nats-server-${version}-${platform}-${natsArch}`);
    const files = await fs.readdir(extractedDir);
    for (const file of files) {
      await fs.rename(path.join(extractedDir, file), path.join(natsDir, file));
    }
    // Remove the now-empty version-specific directory
    await fs.rmdir(extractedDir);

    console.log(`NATS ${version} has been downloaded and extracted to ${natsDir}`);
  } catch (error) {
    console.error('Error downloading or extracting NATS:', error);
    throw error;
  }
}

(async () => {
  try {
    await downloadNats('v2.10.18');
  } catch (error) {
    console.error('Failed to download NATS:', error);
  }
})();

export { downloadNats };
