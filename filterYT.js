var maxNumberOfPages = 6;
var pageNumber = 1;
var searchIndex = 0;
var apiKey = 'INSERT YT API KEY HERE';
var url = 'https://www.googleapis.com/youtube/v3/search';
var nResults = 20;
var howManyVideosPerRow = 5;
var query = $('#trazilica').val().trim();
var counter = 0;
var rows = 0;
var dateObject = new Date();
var months = [0, 28, 59, 89, 120, 150, 181, 212, 242, 273, 303, 334];   /// Kumulativan array dana za svaki mjesec
var options = {
    q: query,
    part: 'snippet',
    type: "video",
    key: apiKey,
    maxResults: 50
}

var searchOptions = {
    part: 'contentDetails, statistics',
    key: apiKey
}

var videosJSON = [];
var videoArray = [];
$(document).ready(function()
{
    // Pozovi funkciju
    delete options.pageToken;
    loadVideos("null", 0, searchIndex);
});

function loadVideos(nextPageString, i, searchIndexCurrent)
{
    // izlaz iz rekurzije
    if (i == maxNumberOfPages)
    {
        return;
    }

    if(nextPageString != "null")
    {
        options.pageToken = nextPageString;
    }


    $.getJSON(url, options, function(data)
    {
        page_token = data.nextPageToken;
        $.each(data.items, function(i, item)
        {
            searchVideoDetails(item, searchIndexCurrent);
        });

        loadVideos(page_token, i+1, searchIndexCurrent);
    });   
}

function okreciStranice()
{
    refreshVideoDisplay();
    start =  pageNumber*nResults - nResults;
    j = start;
    while (counter < nResults)
    {
        if(videoArray[j] == undefined) { break; }
        displayVideoElement(videoArray[j++]);
    }
}
function searchVideoDetails(item, searchIndexCurrent)   // Duboko preporučam bilo kome tko čita ovo da hitro makne pogled dalje od ove funkcije. Ovo je zlo.
{
    if(item == undefined || item.id == undefined) {return false;}
    var filters = {}
    var durLow = $('#durationLower').val();
    var durHi = $('#durationHigher').val();
    var viewLow = $('#viewsLower').val();
    var viewHi = $('#viewsHigher').val();
    var rate = $('#rating').val();
    var release = $('#releaseDate').val();
    if(durLow != "")
    {
        filters.durationLower = parseInt(durLow);
    } else{
        filters.durationLower = 0;
    }
    if(durHi != ""){
        filters.durationHigher = parseInt(durHi);
    } else {
        filters.durationHigher = 999999999;
    }
    if(viewLow != ""){
        filters.viewsLower = parseInt(viewLow);
    } else {
        filters.viewsLower = 0;
    }
    if(viewHi != ""){
        filters.viewsHigher = parseInt(viewHi);
    } else {
        filters.viewsHigher = 99999999999999;
    }
    if(rate != "") {
        filters.ratings = parseInt(rate);
    } else {
        filters.ratings = 0;
    }
    if(release != ""){
        filters.released = parseInt(release);
    } else {
        filters.released = 99999;
    }

    searchOptions.id = item.id.videoId; // id: item.id.videoId
    searchURL = `https://www.googleapis.com/youtube/v3/videos`;
    $.getJSON(searchURL, searchOptions, function(data)
    { 
        var video = {
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            id: item.id.videoId,
            title: item.snippet.title,
            thumb: item.snippet.thumbnails.default.url,
            description: item.snippet.description.substring(0, 100),
            views: data.items[0].statistics.viewCount,
            likes: data.items[0].statistics.likeCount,
            dislikes: data.items[0].statistics.dislikeCount,
            duration: data.items[0].contentDetails.duration.substring(2,data.items[0].contentDetails.duration.length),
            dateUploaded: controlUploadDate(item.snippet.publishedAt)
        }
        let process = function(video, filters, callback)
        {
           return callback(video, filters, searchIndexCurrent);
        }

        process(video, filters, filterFunction);
    });
}

let filterFunction = function(video, filters, searchIndexCurrent)
{
    var duration = controlDuration(video.duration);
    video.durationInteger = duration;
    ratingsRatio = Math.round(100 * parseFloat(video.likes)/(parseFloat(video.likes) + parseFloat(video.dislikes)));   

    // Tu primjeniti filtere
    if((video.durationInteger >= filters.durationLower) && (video.durationInteger <= filters.durationHigher) && (ratingsRatio >= filters.ratings) 
    && (filters.viewsHigher >= video.views) && (filters.viewsLower <= video.views) && (video.dateUploaded <= filters.released)) 
    {
        // Problemi s race conditioningom HOPEFULLY riješeni uz pomoć searchIndex i searchIndexCurrent
        //console.log(searchIndexCurrent, searchIndex);
        if((searchIndexCurrent == searchIndex))
        { 
            videoArray.push(video);
            // console.log(video.dateUploaded);
            if(counter < 20) {displayVideoElement(video);}
        }         
        return;
    }
    return;
}

function search()
{
    searchIndex++;
    videoArray = [];
    resetPageButtons();
    refreshVideoDisplay();
    options.q = $('#trazilica').val().trim();
    // Očisti polje videa
    videosJSON = [];
    // Ukloni page token da bi api mogao vratiti rezultat
    delete options.pageToken;
    loadVideos("null", 0, searchIndex);
}

function controlDuration(duration)
{
    var len = 0;
    var hourMark = -1;
    for (i = 0; i < duration.length; i++)
    {
        if(duration.charAt(i) == 'H')
        {
            len += parseInt(duration.substr(0,i)) * 60;
            hourMark = i;
        }
        if(duration.charAt(i) == 'M')
        {
            len += parseInt(duration.substr(hourMark+1, i));
        }
    }
    return len;
}

function controlUploadDate(dateYT)
{
    var year = parseInt(dateYT.slice(0, 4)) - 2004; // 2005 godine je stavljen prvi video na youtube, stoga nema potrebe krcati JS nepotrebnim kalkulacijama
    var month = parseInt(dateYT.slice(5,8)) - 1;    // a 2004 je odabrana tako da ostane da je prijestupna godina od 0
    var day = parseInt(dateYT.slice(8, 11));
    if (year % 4 == 0 && month == 1)
    {
        day++;
    }
    var cumulativeDate = year*365 + months[month] + day;

    var currentDay = dateObject.getDate();
    var currentMonth = dateObject.getMonth();
    var currentYear = dateObject.getFullYear() - 2004;
    //console.log(`${currentDay} - ${currentMonth} - ${currentYear}`);
    if (currentYear % 4 == 0 && currentMonth == 1)
    { currentDay++; }
    var cumulativeCurrentDate = currentYear*365 + months[currentMonth] + currentDay;
    return cumulativeCurrentDate - cumulativeDate;
}
async function displayVideoElement(video)
{
    if(counter%howManyVideosPerRow == 0)
    {
        rows++;
        $('#videos').append(`<div class='d-flex p-2' id='row${rows}'>`);
    }
    $(`#row${rows}`).append(`
        <article class='card' style="width: 18rem; background-color: rgba(255,255,255,0.75);")">
            <img src="${video.thumb}" onclick="displayVideo('${video.id}')" class="center-block" >
            <div class="card-body" onclick="displayVideo('${video.id}')">
            <a href="${video.url}">
                <h6 class="card-title">${video.title}</h6>
            </a>
                <p class="card-text" style="font-size: xx-small">${video.description}</p>
            </div>

        </article>
        `);
    counter++;
}

function displayVideo(videoId)
{
    var autoplay = "&autoplay=1";
    $('#frame').attr("src", `https://www.youtube.com/embed/${videoId}?controls=1${autoplay}`);
    $('#embed').attr("style", "visibility: visible");
}
function hideDiv()
{
    $('#embed').attr("style", "visibility: hidden");
    var src = $('#frame').attr("src");
    src = src.slice(0, -1) + "0";
    $('#frame').attr("src", src );
}

function setPageClicked(el)
{
    resetPageButtons();
    $(el).parent().addClass('active');

    var clicked = $(el).html();
    if(clicked == "Next")
    {
        pageNumber++;
    }
    else if(clicked == "Previous")
    {
        if (pageNumber > 1) {pageNumber--;}
    }
    else
    {
        pageNumber = clicked;
    }
    okreciStranice();
}

function obradiKeyPress(e)
{
    if (e.keyCode == 13)
    {
        search();
        // console.log(videoArray);
    }
    else if (e.keyCode == 27)
    {
        hideDiv();
    }
}

function refreshVideoDisplay()
{
    counter = 0;
    rows = 0;
    $('#videos').html("");
}

function resetPageButtons()
{
    $('.page-item').removeClass('active');
}