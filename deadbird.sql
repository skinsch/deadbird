-- phpMyAdmin SQL Dump
-- version 4.6.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jan 11, 2017 at 12:34 AM
-- Server version: 5.7.15
-- PHP Version: 5.6.27

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
  `total` int(11) NOT NULL DEFAULT '0',
  `deleted` int(11) NOT NULL DEFAULT '0',
  `template` int(11) NOT NULL DEFAULT '0',
  `ext` varchar(5) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `handles`
--

INSERT INTO `handles` (`id`, `handle`, `total`, `deleted`, `template`, `ext`) VALUES
(1, 'katyperry', 0, 0, 0, NULL),
(2, 'justinbieber', 0, 0, 0, NULL),
(3, 'taylorswift13', 0, 0, 0, NULL),
(4, 'barackobama', 0, 0, 0, NULL),
(5, 'rihanna', 0, 0, 0, NULL),
(6, 'youtube', 0, 0, 0, NULL),
(7, 'ladygaga', 0, 0, 0, NULL),
(8, 'theellenshow', 0, 0, 0, NULL),
(9, 'twitter', 0, 0, 0, NULL),
(10, 'jtimberlake', 0, 0, 0, NULL),
(11, 'kimkardashian', 0, 0, 0, NULL),
(12, 'britneyspears', 0, 0, 0, NULL),
(13, 'cristiano', 0, 0, 0, NULL),
(14, 'selenagomez', 0, 0, 0, NULL),
(15, 'cnnbrk', 0, 0, 0, NULL),
(16, 'jimmyfallon', 0, 0, 0, NULL),
(17, 'arianagrande', 0, 0, 0, NULL),
(18, 'shakira', 0, 0, 0, NULL),
(19, 'instagram', 0, 0, 0, NULL),
(20, 'ddlovato', 0, 0, 0, NULL),
(21, 'jlo', 0, 0, 0, NULL),
(22, 'oprah', 0, 0, 0, NULL),
(23, 'drake', 0, 0, 0, NULL),
(24, 'kingjames', 0, 0, 0, NULL),
(25, 'billgates', 0, 0, 0, NULL),
(26, 'nytimes', 0, 0, 0, NULL),
(27, 'onedirection', 0, 0, 0, NULL),
(28, 'kevinhart4real', 0, 0, 0, NULL),
(29, 'mileycyrus', 0, 0, 0, NULL),
(30, 'sportscenter', 0, 0, 0, NULL),
(31, 'espn', 0, 0, 0, NULL),
(32, 'harry_styles', 0, 0, 0, NULL),
(33, 'cnn', 0, 0, 0, NULL),
(34, 'pink', 0, 0, 0, NULL),
(35, 'liltunechi', 0, 0, 0, NULL),
(36, 'wizkhalifa', 0, 0, 0, NULL),
(37, 'niallofficial', 0, 0, 0, NULL),
(38, 'adele', 0, 0, 0, NULL),
(39, 'brunomars', 0, 0, 0, NULL),
(40, 'bbcbreaking', 0, 0, 0, NULL),
(41, 'kanyewest', 0, 0, 0, NULL),
(42, 'kaka', 0, 0, 0, NULL),
(43, 'neymarjr', 0, 0, 0, NULL),
(44, 'actuallynph', 0, 0, 0, NULL),
(45, 'danieltosh', 0, 0, 0, NULL),
(46, 'aliciakeys', 0, 0, 0, NULL),
(47, 'narendramodi', 0, 0, 0, NULL),
(48, 'nba', 0, 0, 0, NULL),
(49, 'liampayne', 0, 0, 0, NULL),
(50, 'louis_tomlinson', 0, 0, 0, NULL),
(51, 'srbachchan', 0, 0, 0, NULL),
(52, 'emmawatson', 0, 0, 0, NULL),
(53, 'pitbull', 0, 0, 0, NULL),
(54, 'khloekardashian', 0, 0, 0, NULL),
(55, 'conanobrien', 0, 0, 0, NULL),
(56, 'iamsrk', 0, 0, 0, NULL),
(57, 'kourtneykardash', 0, 0, 0, NULL),
(58, 'realmadrid', 0, 0, 0, NULL),
(59, 'eminem', 0, 0, 0, NULL),
(60, 'davidguetta', 0, 0, 0, NULL),
(61, 'nickiminaj', 0, 0, 0, NULL),
(62, 'nfl', 0, 0, 0, NULL),
(63, 'avrillavigne', 0, 0, 0, NULL),
(64, 'zaynmalik', 0, 0, 0, NULL),
(65, 'kendalljenner', 0, 0, 0, NULL),
(66, 'beingsalmankhan', 0, 0, 0, NULL),
(67, 'nasa', 0, 0, 0, NULL),
(68, 'fcbarcelona', 0, 0, 0, NULL),
(69, 'aamir_khan', 0, 0, 0, NULL),
(70, 'kyliejenner', 0, 0, 0, NULL),
(71, 'blakeshelton', 0, 0, 0, NULL),
(72, 'chrisbrown', 0, 0, 0, NULL),
(73, 'coldplay', 0, 0, 0, NULL),
(74, 'aplusk', 0, 0, 0, NULL),
(75, 'vine', 0, 0, 0, NULL),
(76, 'theeconomist', 0, 0, 0, NULL),
(77, 'mariahcarey', 0, 0, 0, NULL),
(78, 'edsheeran', 0, 0, 0, NULL),
(79, 'leodicaprio', 0, 0, 0, NULL),
(80, 'bbcworld', 0, 0, 0, NULL),
(81, 'deepikapadukone', 0, 0, 0, NULL),
(82, 'google', 0, 0, 0, NULL),
(83, 'xtina', 0, 0, 0, NULL),
(84, 'agnezmo', 0, 0, 0, NULL),
(85, 'mohamadalarefe', 0, 0, 0, NULL),
(86, 'shugairi', 0, 0, 0, NULL),
(87, 'ricky_martin', 0, 0, 0, NULL),
(88, 'twitterlatam', 0, 0, 0, NULL),
(89, 'priyankachopra', 0, 0, 0, NULL),
(90, 'jimcarrey', 0, 0, 0, NULL),
(91, 'reuters', 0, 0, 0, NULL),
(92, 'ihrithik', 0, 0, 0, NULL),
(93, 'kdtrey5', 0, 0, 0, NULL),
(94, 'ivetesangalo', 0, 0, 0, NULL),
(95, 'ryanseacrest', 0, 0, 0, NULL),
(96, 'alejandrosanz', 0, 0, 0, NULL),
(97, 'snoopdogg', 0, 0, 0, NULL),
(98, 'akshaykumar', 0, 0, 0, NULL),
(99, 'twittersports', 0, 0, 0, NULL),
(100, 'beyonce', 0, 0, 0, NULL);

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
  `tweetSaved` int(11) NOT NULL DEFAULT '0',
  `checks` int(11) NOT NULL DEFAULT '0',
  `checking` tinyint(1) NOT NULL,
  `checkDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
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
-- Indexes for table `tweets`
--
ALTER TABLE `tweets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `asdf` (`handle`,`tweetid`),
  ADD KEY `handle` (`handle`),
  ADD KEY `tweetid` (`tweetid`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `handles`
--
ALTER TABLE `handles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=101;
--
-- AUTO_INCREMENT for table `tweets`
--
ALTER TABLE `tweets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
