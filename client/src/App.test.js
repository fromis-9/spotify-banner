import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import config from './config';
const id='4aawyAB9vmqN3uQ7FjRGTy';
const result={success:true,data:{title:'Example album',type:'album',url:`https://open.spotify.com/album/${id}`,images:[{label:'album cover',imagePath:'/images/cover.jpg',format:'jpg'}]}};
beforeEach(()=>{localStorage.clear();jest.restoreAllMocks();config.features.artistViewSelector=false;});
afterEach(()=>{config.features.artistViewSelector=false;});
test('theme preference persists through the legal page',()=>{
  localStorage.setItem('theme','dark');render(<App/>);
  fireEvent.click(screen.getByRole('button',{name:'Switch to light mode'}));
  expect(localStorage.getItem('theme')).toBe('light');
  fireEvent.click(screen.getByRole('button',{name:'legal'}));
  expect(screen.getByRole('heading',{name:'legal & disclaimer'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/back to site/}));
  expect(screen.getByLabelText('spotify link')).toBeInTheDocument();
});
test('disabled artist view selector uses desktop and never displays mobile',async()=>{
  global.fetch=jest.fn().mockResolvedValue({json:async()=>result});render(<App/>);
  const input=screen.getByLabelText('spotify link');
  expect(screen.queryByRole('button',{name:'mobile'})).not.toBeInTheDocument();
  const spotifyUrl=`https://open.spotify.com/artist/${id}`;
  fireEvent.change(input,{target:{value:spotifyUrl}});
  expect(screen.queryByRole('button',{name:'mobile'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'get artwork'}));
  await screen.findByRole('button',{name:'download'});
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/extractartwork'),expect.objectContaining({body:JSON.stringify({spotifyUrl,deviceType:'desktop'})}));
  fireEvent.change(input,{target:{value:`https://open.spotify.com/album/${id}`}});
  expect(screen.queryByRole('button',{name:'mobile'})).not.toBeInTheDocument();
});
test('loading disables duplicate submissions and preview reports actual dimensions',async()=>{
  let finish;global.fetch=jest.fn(()=>new Promise(resolve=>{finish=resolve;}));render(<App/>);
  fireEvent.change(screen.getByLabelText('spotify link'),{target:{value:result.data.url}});
  fireEvent.click(screen.getByRole('button',{name:'get artwork'}));
  expect(screen.getByRole('button',{name:'extracting...'})).toBeDisabled();
  finish({json:async()=>result});
  const image=await screen.findByRole('img',{name:'Example album — album cover'});
  Object.defineProperty(image,'naturalWidth',{value:640});Object.defineProperty(image,'naturalHeight',{value:640});
  fireEvent.load(image);expect(screen.getByText('640 × 640 · JPG')).toBeInTheDocument();
});
test('request and download failures remain visible',async()=>{
  jest.spyOn(console,'error').mockImplementation(()=>{});
  global.fetch=jest.fn().mockResolvedValueOnce({json:async()=>({success:false,error:'No artwork found.'})}).mockResolvedValueOnce({json:async()=>result}).mockResolvedValueOnce({ok:false});
  render(<App/>);fireEvent.change(screen.getByLabelText('spotify link'),{target:{value:result.data.url}});
  fireEvent.click(screen.getByRole('button',{name:'get artwork'}));expect(await screen.findByRole('alert')).toHaveTextContent('No artwork found.');
  fireEvent.click(screen.getByRole('button',{name:'get artwork'}));fireEvent.click(await screen.findByRole('button',{name:'download'}));
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Download failed.'));
});

test('feature flag restores the mobile selector and request',async()=>{
  config.features.artistViewSelector=true;
  global.fetch=jest.fn().mockResolvedValue({json:async()=>result});render(<App/>);
  const spotifyUrl=`https://open.spotify.com/artist/${id}`;
  fireEvent.change(screen.getByLabelText('spotify link'),{target:{value:spotifyUrl}});
  fireEvent.click(screen.getByRole('button',{name:'mobile'}));
  fireEvent.click(screen.getByRole('button',{name:'get artwork'}));
  await screen.findByRole('button',{name:'download'});
  expect(global.fetch).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({body:JSON.stringify({spotifyUrl,deviceType:'mobile'})}));
});
