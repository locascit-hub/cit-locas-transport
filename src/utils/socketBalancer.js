
function getSocketEndpoint(busNo){
    console.log("Bus number received for socket endpoint:", busNo);
  const i=Math.floor(parseInt(busNo)/20)%4;
  console.log("Calculated index for load balancing:", i);
  if(i==0){//from 0-19
    return `${process.env.REACT_APP_BACKEND_ENDPOINT1.slice(8)}`;// except https://
  }else if(i==1){//from 20-39
    return `${process.env.REACT_APP_BACKEND_ENDPOINT2.slice(8)}`;
  }else if(i==2){//from 40-59
    return `${process.env.REACT_APP_BACKEND_ENDPOINT3.slice(8)}`;
  }else{
    //from 60-79
    return `${process.env.REACT_APP_BACKEND_ENDPOINT3.slice(8)}`;
  }
}

export default getSocketEndpoint;