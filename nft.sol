// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

contract MoodNft is ERC721 {

    error MoodNft__CantFlipMoodIfNotOwner();

    uint256 private s_tokenIdCounter;
    string private s_sadSvgUriimage;
    string private s_happySvgUriimage;

    enum MOOD {
        SAD,
        HAPPY
    }
    
    mapping(uint256 => MOOD) private s_tokenIdtoMood;

    constructor(string memory sadSvg, string memory happySvg) ERC721("MoodNft", "MNFT") {
       s_tokenIdCounter = 0;
        s_sadSvgUriimage = sadSvg;
        s_happySvgUriimage = happySvg;       
    }

    function mintNft() public {
        _safeMint(msg.sender, s_tokenIdCounter);
        s_tokenIdtoMood[s_tokenIdCounter] = MOOD.HAPPY;
        s_tokenIdCounter++;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "data:application/json;base64,";
    }

    function flipMood(uint256 tokenId) public {

      /* if (!_isApprovedOrOwner(msg.sender, tokenId)) {
           revert MoodNft__CantFlipMoodIfNotOwner();
       }*/

       if(s_tokenIdtoMood[tokenId] == MOOD.HAPPY){
           s_tokenIdtoMood[tokenId] = MOOD.SAD;
       } else {
           s_tokenIdtoMood[tokenId] = MOOD.HAPPY;
       }
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {

        string memory imageURI;

        if(s_tokenIdtoMood[tokenId] == MOOD.HAPPY){
            imageURI = s_happySvgUriimage;
        } else {
            imageURI = s_sadSvgUriimage;
        }

        return string(
            abi.encodePacked(
                _baseURI(),
                Base64.encode(
                    bytes( // bytes casting actually unnecessary as 'abi.encodePacked()' returns a bytes
                        abi.encodePacked(
                            '{"name":"',
                            name(), // You can add whatever name here
                            '", "description":"An NFT that reflects the mood of the owner, 100% on Chain!", ',
                            '"attributes": [{"trait_type": "moodiness", "value": 100}], "image":"',
                            imageURI,
                            '"}'
                        )
                    )
                )
            )
        );
   
    }

}