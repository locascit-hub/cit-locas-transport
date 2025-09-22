

function getTrackPageURL(bNo) {
    console.log("Generating track page URL for bus number:", bNo);
    if(!bNo) return null;
    bNo=parseInt(bNo);
    if(bNo<=10) return `${process.env.REACT_APP_TRACKPAGE_BASE_URL}/index.html?bNo=${bNo}`;
    else if(bNo<=20) return `${process.env.REACT_APP_TRACKPAGE_BASE_URL}/index.html?bNo=${bNo}`;
    else if(bNo<=30) return `${process.env.REACT_APP_TRACKPAGE_BASE_URL}/index.html?bNo=${bNo}`;
    else if(bNo<=40) return `${process.env.REACT_APP_TRACKPAGE_BASE_URL}/index.html?bNo=${bNo}`;
    else if(bNo<=50) return `${process.env.REACT_APP_TRACKPAGE_BASE_URL}/index.html?bNo=${bNo}`;
    else if(bNo<=60) return `${process.env.REACT_APP_TRACKPAGE_BASE_URL}/index.html?bNo=${bNo}`;
    else if(bNo<=70) return `${process.env.REACT_APP_TRACKPAGE_BASE_URL}/index.html?bNo=${bNo}`;
    else if(bNo<=80) return `${process.env.REACT_APP_TRACKPAGE_BASE_URL}/index.html?bNo=${bNo}`;
    else if(bNo<=90) return `${process.env.REACT_APP_TRACKPAGE_BASE_URL}/index.html?bNo=${bNo}`;
    else if(bNo<=100) return `${process.env.REACT_APP_TRACKPAGE_BASE_URL}/index.html?bNo=${bNo}`;
    else return `${process.env.REACT_APP_TRACKPAGE_BASE_URL}/index.html?bNo=${bNo}`;
}

export default getTrackPageURL;