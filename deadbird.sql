-- phpMyAdmin SQL Dump
-- version 4.6.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Nov 11, 2016 at 10:42 PM
-- Server version: 5.7.15
-- PHP Version: 5.6.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `deadbird`
--

-- --------------------------------------------------------

--
-- Table structure for table `handles`
--

CREATE TABLE `handles` (
  `id` int(11) NOT NULL,
  `handle` varchar(32) NOT NULL,
  `tweetAlbum` varchar(32) DEFAULT NULL,
  `tweetAlbumHash` varchar(32) DEFAULT NULL,
  `imgAlbum` varchar(32) DEFAULT NULL,
  `imgAlbumHash` varchar(32) DEFAULT NULL,
  `template` int(11) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `handles`
--

INSERT INTO `handles` (`id`, `handle`, `tweetAlbum`, `tweetAlbumHash`, `imgAlbum`, `imgAlbumHash`, `template`) VALUES
(1, 'katyperry', NULL, NULL, NULL, NULL, 0),
(2, 'justinbieber', NULL, NULL, NULL, NULL, 0),
(3, 'taylorswift13', NULL, NULL, NULL, NULL, 0),
(4, 'barackobama', NULL, NULL, NULL, NULL, 0),
(5, 'rihanna', NULL, NULL, NULL, NULL, 0),
(6, 'youtube', NULL, NULL, NULL, NULL, 0),
(7, 'ladygaga', NULL, NULL, NULL, NULL, 0),
(8, 'theellenshow', NULL, NULL, NULL, NULL, 0),
(9, 'twitter', NULL, NULL, NULL, NULL, 0),
(10, 'jtimberlake', NULL, NULL, NULL, NULL, 0),
(11, 'kimkardashian', NULL, NULL, NULL, NULL, 0),
(12, 'britneyspears', NULL, NULL, NULL, NULL, 0),
(13, 'cristiano', NULL, NULL, NULL, NULL, 0),
(14, 'selenagomez', NULL, NULL, NULL, NULL, 0),
(15, 'cnnbrk', NULL, NULL, NULL, NULL, 0),
(16, 'jimmyfallon', NULL, NULL, NULL, NULL, 0),
(17, 'arianagrande', NULL, NULL, NULL, NULL, 0),
(18, 'shakira', NULL, NULL, NULL, NULL, 0),
(19, 'instagram', NULL, NULL, NULL, NULL, 0),
(20, 'ddlovato', NULL, NULL, NULL, NULL, 0),
(21, 'jlo', NULL, NULL, NULL, NULL, 0),
(22, 'oprah', NULL, NULL, NULL, NULL, 0),
(23, 'drake', NULL, NULL, NULL, NULL, 0),
(24, 'kingjames', NULL, NULL, NULL, NULL, 0),
(25, 'billgates', NULL, NULL, NULL, NULL, 0),
(26, 'nytimes', NULL, NULL, NULL, NULL, 0),
(27, 'onedirection', NULL, NULL, NULL, NULL, 0),
(28, 'kevinhart4real', NULL, NULL, NULL, NULL, 0),
(29, 'mileycyrus', NULL, NULL, NULL, NULL, 0),
(30, 'sportscenter', NULL, NULL, NULL, NULL, 0),
(31, 'espn', NULL, NULL, NULL, NULL, 0),
(32, 'harry_styles', NULL, NULL, NULL, NULL, 0),
(33, 'cnn', NULL, NULL, NULL, NULL, 0),
(34, 'pink', NULL, NULL, NULL, NULL, 0),
(35, 'liltunechi', NULL, NULL, NULL, NULL, 0),
(36, 'wizkhalifa', NULL, NULL, NULL, NULL, 0),
(37, 'niallofficial', NULL, NULL, NULL, NULL, 0),
(38, 'adele', NULL, NULL, NULL, NULL, 0),
(39, 'brunomars', NULL, NULL, NULL, NULL, 0),
(40, 'bbcbreaking', NULL, NULL, NULL, NULL, 0),
(41, 'kanyewest', NULL, NULL, NULL, NULL, 0),
(42, 'kaka', NULL, NULL, NULL, NULL, 0),
(43, 'neymarjr', NULL, NULL, NULL, NULL, 0),
(44, 'actuallynph', NULL, NULL, NULL, NULL, 0),
(45, 'danieltosh', NULL, NULL, NULL, NULL, 0),
(46, 'aliciakeys', NULL, NULL, NULL, NULL, 0),
(47, 'narendramodi', NULL, NULL, NULL, NULL, 0),
(48, 'nba', NULL, NULL, NULL, NULL, 0),
(49, 'liampayne', NULL, NULL, NULL, NULL, 0),
(50, 'louis_tomlinson', NULL, NULL, NULL, NULL, 0),
(51, 'srbachchan', NULL, NULL, NULL, NULL, 0),
(52, 'emmawatson', NULL, NULL, NULL, NULL, 0),
(53, 'pitbull', NULL, NULL, NULL, NULL, 0),
(54, 'khloekardashian', NULL, NULL, NULL, NULL, 0),
(55, 'conanobrien', NULL, NULL, NULL, NULL, 0),
(56, 'iamsrk', NULL, NULL, NULL, NULL, 0),
(57, 'kourtneykardash', NULL, NULL, NULL, NULL, 0),
(58, 'realmadrid', NULL, NULL, NULL, NULL, 0),
(59, 'eminem', NULL, NULL, NULL, NULL, 0),
(60, 'davidguetta', NULL, NULL, NULL, NULL, 0),
(61, 'nickiminaj', NULL, NULL, NULL, NULL, 0),
(62, 'nfl', NULL, NULL, NULL, NULL, 0),
(63, 'avrillavigne', NULL, NULL, NULL, NULL, 0),
(64, 'zaynmalik', NULL, NULL, NULL, NULL, 0),
(65, 'kendalljenner', NULL, NULL, NULL, NULL, 0),
(66, 'beingsalmankhan', NULL, NULL, NULL, NULL, 0),
(67, 'nasa', NULL, NULL, NULL, NULL, 0),
(68, 'fcbarcelona', NULL, NULL, NULL, NULL, 0),
(69, 'aamir_khan', NULL, NULL, NULL, NULL, 0),
(70, 'kyliejenner', NULL, NULL, NULL, NULL, 0),
(71, 'blakeshelton', NULL, NULL, NULL, NULL, 0),
(72, 'chrisbrown', NULL, NULL, NULL, NULL, 0),
(73, 'coldplay', NULL, NULL, NULL, NULL, 0),
(74, 'aplusk', NULL, NULL, NULL, NULL, 0),
(75, 'vine', NULL, NULL, NULL, NULL, 0),
(76, 'theeconomist', NULL, NULL, NULL, NULL, 0),
(77, 'mariahcarey', NULL, NULL, NULL, NULL, 0),
(78, 'edsheeran', NULL, NULL, NULL, NULL, 0),
(79, 'leodicaprio', NULL, NULL, NULL, NULL, 0),
(80, 'bbcworld', NULL, NULL, NULL, NULL, 0),
(81, 'deepikapadukone', NULL, NULL, NULL, NULL, 0),
(82, 'google', NULL, NULL, NULL, NULL, 0),
(83, 'xtina', NULL, NULL, NULL, NULL, 0),
(84, 'agnezmo', NULL, NULL, NULL, NULL, 0),
(85, 'mohamadalarefe', NULL, NULL, NULL, NULL, 0),
(86, 'shugairi', NULL, NULL, NULL, NULL, 0),
(87, 'ricky_martin', NULL, NULL, NULL, NULL, 0),
(88, 'twitterespanol', NULL, NULL, NULL, NULL, 0),
(89, 'priyankachopra', NULL, NULL, NULL, NULL, 0),
(90, 'jimcarrey', NULL, NULL, NULL, NULL, 0),
(91, 'reuters', NULL, NULL, NULL, NULL, 0),
(92, 'ihrithik', NULL, NULL, NULL, NULL, 0),
(93, 'kdtrey5', NULL, NULL, NULL, NULL, 0),
(94, 'ivetesangalo', NULL, NULL, NULL, NULL, 0),
(95, 'ryanseacrest', NULL, NULL, NULL, NULL, 0),
(96, 'alejandrosanz', NULL, NULL, NULL, NULL, 0),
(97, 'snoopdogg', NULL, NULL, NULL, NULL, 0),
(98, 'akshaykumar', NULL, NULL, NULL, NULL, 0),
(99, 'twittersports', NULL, NULL, NULL, NULL, 0),
(100, 'beyonce', NULL, NULL, NULL, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `image`
--

CREATE TABLE `image` (
  `id` int(11) NOT NULL,
  `handle` int(11) NOT NULL,
  `type` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `tweets`
--

CREATE TABLE `tweets` (
  `id` int(11) NOT NULL,
  `handle` int(11) NOT NULL,
  `tweetid` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fetchDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleteDate` timestamp NULL DEFAULT NULL,
  `content` text COLLATE utf8_unicode_ci,
  `media` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `tweetSaved` int(11) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `handles`
--
ALTER TABLE `handles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `handle` (`handle`);

--
-- Indexes for table `image`
--
ALTER TABLE `image`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tweets`
--
ALTER TABLE `tweets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `asdf` (`handle`,`tweetid`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `handles`
--
ALTER TABLE `handles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=101;
--
-- AUTO_INCREMENT for table `image`
--
ALTER TABLE `image`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tweets`
--
ALTER TABLE `tweets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
