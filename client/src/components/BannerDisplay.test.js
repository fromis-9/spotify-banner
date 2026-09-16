import { fireEvent, render, screen } from '@testing-library/react';
import BannerDisplay from './BannerDisplay';
import { artworkZip, saveBlob } from '../artwork-downloads';
jest.mock('../artwork-downloads', () => ({ artworkZip: jest.fn(), saveBlob: jest.fn(), fetchImage: jest.fn(), safeFilename: () => 'artist' }));
const photo = {label:'profile photo',format:'jpg',imagePath:'/images/photo.jpg',sourceUrl:'https://i.scdn.co/image/photo'};
const banner = {...photo,label:'artist banner',imagePath:'/images/banner.jpg',sourceUrl:'https://i.scdn.co/image/banner'};
const data = {type:'artist',title:'Artist',url:'https://open.spotify.com/artist/example',images:[banner,photo]};
beforeEach(() => { jest.clearAllMocks(); });
test('copies the original URL and gives a selectable fallback when clipboard access fails', async () => {
  const writeText = jest.fn().mockResolvedValueOnce().mockRejectedValueOnce(new Error('denied'));
  Object.defineProperty(navigator, 'clipboard', {configurable:true,value:{writeText}});
  render(<BannerDisplay data={data} />);
  fireEvent.click(screen.getAllByRole('button',{name:'copy image link'})[0]);
  expect(await screen.findByRole('status')).toHaveTextContent('image link copied');
  expect(writeText).toHaveBeenCalledWith(photo.sourceUrl);
  fireEvent.click(screen.getAllByRole('button',{name:'copy image link'})[0]);
  expect(await screen.findByLabelText('original image link')).toHaveValue(photo.sourceUrl);
});
test('downloads one archive with photos first and reports archive failures', async () => {
  const archive = new Blob(['zip']);
  artworkZip.mockResolvedValueOnce(archive).mockRejectedValueOnce(new Error('expired'));
  render(<BannerDisplay data={data} />);
  fireEvent.click(screen.getByRole('button',{name:'download all images (.zip)'}));
  expect(screen.getByRole('button',{name:'preparing zip…'})).toBeDisabled();
  await screen.findByRole('button',{name:'download all images (.zip)'});
  expect(artworkZip).toHaveBeenCalledWith([photo,banner]);
  expect(saveBlob).toHaveBeenCalledWith(archive,'artist-artwork.zip');
  fireEvent.click(screen.getByRole('button',{name:'download all images (.zip)'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not download all images');
});
test('single-image and older backend results do not show unavailable actions', () => {
  render(<BannerDisplay data={{...data,images:[{...photo,sourceUrl:undefined}]}} />);
  expect(screen.queryByRole('button',{name:/download all/})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'copy image link'})).not.toBeInTheDocument();
});
