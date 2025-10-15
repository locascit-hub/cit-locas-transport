
function getSocketEndpoint(busNo){
    console.log("Bus number received for socket endpoint:", busNo);
  const i=Math.floor(parseInt(busNo)/25)%4;
  console.log("Calculated index for load balancing:", i);
  if(i==0){//from 0-24
    return `${process.env.REACT_APP_BACKEND_ENDPOINT1}`;
  }else if(i==1){//from 25-49
    return `${process.env.REACT_APP_BACKEND_ENDPOINT2}`;
  }else if(i==2){
    //from 50-74
    return `${process.env.REACT_APP_BACKEND_ENDPOINT3}`;
  }else{
    //from 75-99
    return `${process.env.REACT_APP_BACKEND_ENDPOINT4}`;
  }
}

export default getSocketEndpoint;