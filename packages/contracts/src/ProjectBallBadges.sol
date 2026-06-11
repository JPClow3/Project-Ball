// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract ProjectBallBadges {
    string public constant name = "ProjectBall Badges";
    string public constant symbol = "PBBDG";

    address public owner;

    uint256 private _nextTokenId;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    error OnlyOwner();
    error Soulbound();
    error InvalidRecipient();
    error NonExistentToken();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(address initialOwner) {
        owner = initialOwner;
    }

    function mint(address to, string memory uri) external onlyOwner returns (uint256) {
        if (to == address(0)) revert InvalidRecipient();

        uint256 tokenId = ++_nextTokenId;
        
        _owners[tokenId] = to;
        _balances[to] += 1;
        _tokenURIs[tokenId] = uri;

        emit Transfer(address(0), to, tokenId);

        return tokenId;
    }

    function balanceOf(address account) external view returns (uint256) {
        if (account == address(0)) revert InvalidRecipient();
        return _balances[account];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address tokenOwner = _owners[tokenId];
        if (tokenOwner == address(0)) revert NonExistentToken();
        return tokenOwner;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (_owners[tokenId] == address(0)) revert NonExistentToken();
        return _tokenURIs[tokenId];
    }

    // Soulbound token implementation - transferring is not allowed unless it's a mint.
    // We intentionally do not implement transferFrom or safeTransferFrom to prevent movement.
    function transferFrom(address, address, uint256) external pure {
        revert Soulbound();
    }
}
